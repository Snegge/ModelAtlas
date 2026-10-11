using ModelAtlas.Api;
using Xunit;
namespace ModelAtlas.Tests;

public sealed class EstimatorTests
{
    static readonly ModelRelease Model = new("r-test", "Fixture", "test", "test", "test/fixture", true,
        7_000_000_000, null, new("llama",32,4096,32,8,128,null,null,null,"https://example.org/config"),
        131072,"model-config","apache-2.0","https://example.org","https://example.org","test",DateTimeOffset.UtcNow,"verified-metadata",[]);
    static ModelArtifact Artifact(long bytes = 4L * 1024*1024*1024) => new("a-test",Model.Id,"test/fixture","test","Q4_K_M",15,"GGUF",bytes,
        [new("fixture.gguf",bytes,"test","https://example.org")],"https://example.org","verified-metadata",[],DateTimeOffset.UtcNow);
    readonly Estimator engine = new();
    [Fact] public void IncreasingContextIncreasesCacheAndTotal()
    {
        var a=engine.Evaluate(Model,Artifact(),new(){ContextTokens=4096});
        var b=engine.Evaluate(Model,Artifact(),new(){ContextTokens=8192});
        Assert.Equal(a.CacheGiB*2,b.CacheGiB); Assert.True(b.TotalGiB>a.TotalGiB);
    }
    [Fact] public void CacheUsesKvHeadsPrecisionAndConcurrency()
    {
        var a=engine.Evaluate(Model,Artifact(),new(){ContextTokens=8192});
        Assert.Equal(1,a.CacheGiB);
        var b=engine.Evaluate(Model,Artifact(),new(){ContextTokens=8192,CachePrecision="f32",Concurrency=2});
        Assert.Equal(4,b.CacheGiB);
    }
    [Fact] public void MissingArchitectureIsExplicitlyUnknown()
    {
        var e=engine.Evaluate(Model with{Architecture=Model.Architecture with{KvHeads=null}},Artifact(),new());
        Assert.Equal("unknown",e.Status);Assert.Null(e.TotalGiB);Assert.NotEmpty(e.Reasons);
    }
    [Fact] public void UnsupportedAndMoeArchitecturesAreUnknown()
    {
        Assert.Equal("unknown",engine.Evaluate(Model with{Architecture=Model.Architecture with{Type="mamba"}},Artifact(),new()).Status);
        Assert.Equal("unknown",engine.Evaluate(Model with{Architecture=Model.Architecture with{Experts=8}},Artifact(),new()).Status);
    }
    [Fact] public void DedicatedGpuDoesNotCountRamAsVram()
    {
        var a=engine.Evaluate(Model,Artifact(),new(){GpuGiB=2,RamGiB=64,AllowOffload=false});
        Assert.Equal("outside-budget",a.Status);
        var b=engine.Evaluate(Model,Artifact(),new(){GpuGiB=4,RamGiB=16,AllowOffload=true});
        Assert.Equal("offload",b.Status);
        Assert.True(b.GpuRequiredGiB<=4);Assert.True(b.SystemRequiredGiB<=16);
        // Weight placement across distinct pools is conserved; the host reserve is explicit.
        Assert.Equal(4.0,(b.GpuRequiredGiB-b.CacheGiB-b.RuntimeGiB-b.SafetyGiB+b.SystemRequiredGiB-2)!.Value,8);
    }
    [Fact] public void HostReserveIsRequiredEvenWhenGpuFits()
    {
        Assert.Equal("outside-budget",engine.Evaluate(Model,Artifact(),new(){GpuGiB=24,RamGiB=1}).Status);
    }
    [Fact] public void ZeroGpuDoesNotPretendToBeCpuOrUnifiedMemory()
    {
        Assert.Equal("outside-budget",engine.Evaluate(Model,Artifact(),new(){GpuGiB=0,RamGiB=128}).Status);
    }
    [Fact] public void ArtifactSizesAndBreakdownAreConserved()
    {
        var e=engine.Evaluate(Model,Artifact(),new());
        Assert.Equal(e.WeightsGiB+e.CacheGiB+e.RuntimeGiB+e.SafetyGiB,e.TotalGiB);
        Assert.Equal("unverified",e.RuntimeCompatibility);
        var bad=Artifact() with {SizeBytes=5};
        Assert.Equal("unknown",engine.Evaluate(Model,bad,new()).Status);
    }
    [Fact] public void RequestedContextCannotExceedDocumentedLimit()
    {
        var e=engine.Evaluate(Model with{ContextLimit=4096},Artifact(),new(){ContextTokens=8192,GpuGiB=192});
        Assert.Equal("outside-budget",e.Status);Assert.False(e.ContextSatisfied);
    }
    [Fact] public void InvalidSettingsAreRejected()
    {
        Assert.NotEmpty(Estimator.Validate(new(){GpuGiB=double.NaN,Concurrency=0,ContextTokens=-1}));
        Assert.Empty(Estimator.Validate(new()));
    }
    [Fact] public void RealArtifactWeightsDifferAndSnapshotIsTraceable()
    {
        var c=new CatalogService(Path.Combine(AppContext.BaseDirectory,"Data","catalog.json"));
        var group=c.Snapshot.Artifacts.GroupBy(a=>a.ReleaseId).First(g=>g.Select(a=>a.Quantization).Distinct().Count()>=2);
        var r=c.Snapshot.Releases.First(r=>r.Id==group.Key);var pair=group.OrderBy(a=>a.SizeBytes).ToArray();
        var first=engine.Evaluate(r,pair[0],new());var last=engine.Evaluate(r,pair[^1],new());
        Assert.True(last.WeightsGiB>first.WeightsGiB);Assert.Equal(pair[0].SizeBytes/1073741824.0,first.WeightsGiB);
        Assert.All(c.Snapshot.Artifacts,a=>{Assert.Equal(40,a.Revision.Length);Assert.All(a.Files,f=>Assert.Equal(64,f.Sha256.Length));});
        Assert.InRange(c.Snapshot.Releases.Count,20,60);Assert.True(c.Snapshot.Releases.Select(r=>r.Family).Distinct().Count()>=4);
    }
    [Fact] public void ScenarioUsesStableBaselineAndLabelsRepresentativeChanges()
    {
        var c=new CatalogService(Path.Combine(AppContext.BaseDirectory,"Data","catalog.json"));
        var baseline=new HardwareSettings{Quantization="Q4_K_M",ContextTokens=8192};
        var result=c.Evaluate(new(new(){Quantization="Q8_0",ContextTokens=16384},baseline),engine);
        Assert.Equal(8192,result.Baseline!.ContextTokens);Assert.Equal("Q4_K_M",result.Baseline.Quantization);
        Assert.Contains(result.Releases,r=>r.RepresentativeChanged);
        var exact=result.Artifacts.First(a=>a.Scenario.CacheGiB>0);
        Assert.Equal(exact.Baseline!.CacheGiB*2,exact.Scenario.CacheGiB);
    }
}
