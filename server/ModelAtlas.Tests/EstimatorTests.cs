using System.Text.Json;
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
    static CatalogService Catalog() => new(Path.Combine(AppContext.BaseDirectory,"Data","catalog.json"));
    readonly Estimator engine = new();
    [Fact] public void CompositeScoreUsesSourcedQualityAndRamNeverChangesGpuResults()
    {
        var model=Model with {QualityRating=new(80,"external-curated","https://example.org",DateTimeOffset.UtcNow,"Fixture")};
        var settings=new HardwareSettings {GpuGiB=12,BandwidthGBps=360,RamGiB=1};
        var lowRam=engine.Evaluate(model,Artifact(),settings);
        var ampleRam=engine.Evaluate(model,Artifact(),settings with {RamGiB=128});
        Assert.Equal(lowRam.Speed,ampleRam.Speed);Assert.Equal(lowRam.TotalGiB,ampleRam.TotalGiB);
        Assert.Equal(lowRam.SuitabilityScore,ampleRam.SuitabilityScore);
        Assert.NotNull(lowRam.RamAdvice);Assert.Null(ampleRam.RamAdvice);
        var parts=lowRam.ScoreBreakdown!;
        Assert.Equal(36,parts.Quality);Assert.Equal(25,parts.Fit);
        Assert.Equal(Math.Min(15,Math.Log2(lowRam.Speed!.Typical+1)*2.3),parts.Speed);
        Assert.Equal(Math.Min(15,lowRam.TotalGiB!.Value/12/.70*15),parts.Utilization);
        var tight=engine.Evaluate(model,Artifact(),settings with{GpuGiB=lowRam.TotalGiB.Value});
        Assert.Equal(22,tight.ScoreBreakdown!.Fit);Assert.Equal(15,tight.ScoreBreakdown.Utilization);
        Assert.Equal(360e9/(5*1073741824.0)*.70*1.08,lowRam.Speed.Typical,8);
    }
    [Fact] public void ContextChangesMemoryAndDecodingTogether()
    {
        var a=engine.Evaluate(Model,Artifact(),new(){ContextTokens=4096,BandwidthGBps=360});
        var b=engine.Evaluate(Model,Artifact(),new(){ContextTokens=8192,BandwidthGBps=360});
        Assert.Equal(.5,a.CacheGiB); Assert.Equal(1,b.CacheGiB);
        Assert.True(b.TotalGiB>a.TotalGiB); Assert.True(b.Speed!.Low<a.Speed!.Low);
        Assert.Equal(Math.Floor(360e9/(5*1073741824.0)*.50*1.08),b.Speed.Low);
        Assert.Equal(Math.Ceiling(360e9/(5*1073741824.0)*.85*1.08),b.Speed.High);
    }
    [Fact] public void OnlyF16AndOneRequestAreSupported()
    {
        Assert.NotEmpty(Estimator.Validate(new(){CachePrecision="f32"}));
        Assert.NotEmpty(Estimator.Validate(new(){Concurrency=2}));
        Assert.Equal("unknown",engine.Evaluate(Model,Artifact(),new(){Concurrency=2}).Status);
    }
    [Fact] public void UnsupportedMissingAndMoeArchitecturesAreUnknown()
    {
        foreach(var a in new[]{Model.Architecture with{KvHeads=null},Model.Architecture with{Type="mamba"},Model.Architecture with{Experts=8}})
            Assert.Equal("unknown",engine.Evaluate(Model with{Architecture=a},Artifact(),new()).Status);
    }
    [Fact] public void FullGpuPlacementIsRequiredAndLegacyFieldsCannotEnableAnotherPath()
    {
        var settings=JsonSerializer.Deserialize<HardwareSettings>("""{"gpuGiB":4,"ramGiB":1000,"allowOffload":true,"bandwidthGBps":360}""",new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
        var e=engine.Evaluate(Model,Artifact(),settings);
        Assert.Equal("outside-budget",e.Status);Assert.False(e.Eligible);Assert.Null(e.Speed);
        var json=JsonSerializer.Serialize(settings,new JsonSerializerOptions(JsonSerializerDefaults.Web));
        Assert.Contains("ramGiB",json);Assert.DoesNotContain("allowOffload",json);
    }
    [Fact] public void MemoryBoundaryAndMinimumSpeedAreInclusive()
    {
        var e=engine.Evaluate(Model,Artifact(),new(){BandwidthGBps=360});
        Assert.Equal(e.WeightsGiB+e.CacheGiB+e.RuntimeGiB+e.SafetyGiB,e.TotalGiB);
        Assert.Equal("gpu-fit",engine.Evaluate(Model,Artifact(),new(){GpuGiB=e.TotalGiB!.Value}).Status);
        Assert.Equal("outside-budget",engine.Evaluate(Model,Artifact(),new(){GpuGiB=e.TotalGiB!.Value-1e-6}).Status);
        Assert.True(engine.Evaluate(Model,Artifact(),new(){BandwidthGBps=360,MinimumTokensPerSecond=e.Speed!.Low}).Eligible);
        Assert.False(engine.Evaluate(Model,Artifact(),new(){BandwidthGBps=360,MinimumTokensPerSecond=e.Speed.Low+.1}).Eligible);
    }
    [Fact] public void MissingBandwidthDoesNotMakeARecommendation()
    {
        var e=engine.Evaluate(Model,Artifact(),new());
        Assert.Equal("gpu-fit",e.Status);Assert.Null(e.Speed);Assert.False(e.Eligible);
        Assert.Equal("outside-budget",engine.Evaluate(Model,Artifact(),new(){GpuGiB=0}).Status);
    }
    [Fact] public void SuitabilityRequiresFitContextAndMinimumSpeedWithoutChangingReferenceQuality()
    {
        var reference=Catalog().Snapshot.Releases[0].ReferenceQuality!;
        var model=Model with{ReferenceQuality=reference};
        var fit=engine.Evaluate(model,Artifact(),new(){BandwidthGBps=360});
        Assert.Equal(.45*reference.Score,fit.ScoreBreakdown!.Quality);
        Assert.Equal(fit.ScoreBreakdown.Quality+fit.ScoreBreakdown.Fit+fit.ScoreBreakdown.Speed+fit.ScoreBreakdown.Utilization,fit.SuitabilityScore);
        var slow=engine.Evaluate(model,Artifact(),new(){BandwidthGBps=360,MinimumTokensPerSecond=fit.Speed!.Low+.1});
        Assert.Equal(0d,slow.SuitabilityScore);Assert.NotNull(slow.Speed);
        Assert.Equal(fit.SuitabilityScore,engine.Evaluate(model,Artifact(),new(){BandwidthGBps=360,MinimumTokensPerSecond=fit.Speed.Low}).SuitabilityScore);
        var tooLarge=engine.Evaluate(model,Artifact(),new(){GpuGiB=1,BandwidthGBps=360});
        Assert.Equal(0d,tooLarge.SuitabilityScore);Assert.Null(tooLarge.Speed);
        var context=engine.Evaluate(model with{ContextLimit=4096},Artifact(),new(){ContextTokens=8192,GpuGiB=192,BandwidthGBps=360});
        Assert.Equal(0d,context.SuitabilityScore);Assert.False(context.ContextSatisfied);
        Assert.Null(engine.Evaluate(model,Artifact(),new()).SuitabilityScore);
        Assert.Null(engine.Evaluate(model,Artifact(),new(){Concurrency=2}).SuitabilityScore);
        Assert.Equal(reference.Score,model.ReferenceQuality!.Score);
    }
    [Fact] public void ContextAndFileSetMustBeValid()
    {
        Assert.Equal("outside-budget",engine.Evaluate(Model with{ContextLimit=4096},Artifact(),new(){ContextTokens=8192,GpuGiB=192}).Status);
        Assert.Equal("unknown",engine.Evaluate(Model,Artifact() with{SizeBytes=5},new()).Status);
        Assert.NotEmpty(Estimator.Validate(new(){GpuGiB=double.NaN,BandwidthGBps=double.PositiveInfinity,MinimumTokensPerSecond=-1}));
        Assert.Empty(Estimator.Validate(new()));
    }
    [Fact] public void EveryPublishedVariantHasCompleteQualityMemoryAndSpeedInputs()
    {
        var c=Catalog();CatalogService.Validate(c.Snapshot);
        foreach(var a in c.Snapshot.Artifacts) {
            var r=c.Snapshot.Releases.Single(r=>r.Id==a.ReleaseId);
            var e=engine.Evaluate(r,a,new(){GpuGiB=192,ContextTokens=256,BandwidthGBps=936,MinimumTokensPerSecond=0});
            Assert.NotNull(e.TotalGiB);Assert.NotNull(e.Speed);Assert.NotNull(r.QualityRating);
            if(r.ReferenceQuality is {} reference) Assert.Equal(50*reference.Values.Sum(),reference.Score,8);
            Assert.InRange(e.SuitabilityScore!.Value,0,100);
        }
    }
    [Fact] public void InvalidQualityMappingAndSizesRejectWholeSnapshot()
    {
        var c=Catalog().Snapshot;var r=c.Releases[0];var a=c.Artifacts[0];
        Assert.Throws<InvalidDataException>(()=>CatalogService.Validate(c with{Releases=[r with{ReferenceQuality=null}]}));
        Assert.Throws<InvalidDataException>(()=>CatalogService.Validate(c with{Releases=[r with{ReferenceQuality=r.ReferenceQuality! with{Values=[.5]}}]}));
        Assert.Throws<InvalidDataException>(()=>CatalogService.Validate(c with{Artifacts=[a with{ReleaseId="missing"}]}));
        Assert.Throws<InvalidDataException>(()=>CatalogService.Validate(c with{Artifacts=[a with{SizeBytes=1}]}));
        Assert.Throws<InvalidDataException>(()=>CatalogService.Validate(c with{Releases=[null!]}));
        Assert.Throws<InvalidDataException>(()=>CatalogService.Validate(c with{Artifacts=[a with{Files=[null!]}]}));
        Assert.Throws<InvalidDataException>(()=>CatalogService.Validate(c with{Artifacts=[a with{Files=[a.Files[0] with{Url=null!}]}]}));
    }
    [Fact] public void RecommendationChecksAllVariantsAndDoesNotForceOversizedPreference()
    {
        var c=Catalog();var s=new HardwareSettings{GpuGiB=12,BandwidthGBps=360,Quantization="Q8_0",ContextTokens=4096};
        var e=c.Evaluate(new(s,null),engine);
        foreach(var r in e.Releases) {
            var ids=c.Snapshot.Artifacts.Where(a=>a.ReleaseId==r.ReleaseId).Select(a=>a.Id).ToHashSet();
            Assert.Equal(e.Artifacts.Any(a=>ids.Contains(a.ArtifactId)&&a.Scenario.Eligible),r.Scenario.Eligible);
            if(r.Scenario.Eligible) Assert.Equal(e.Artifacts.Where(a=>ids.Contains(a.ArtifactId)&&a.Scenario.Eligible).Max(a=>a.Scenario.SuitabilityScore),r.Scenario.SuitabilityScore);
        }
        var scores=e.Releases.Where(r=>r.Scenario.Eligible).Select(p=>p.Scenario.SuitabilityScore).ToArray();
        Assert.Equal(scores.OrderDescending(),scores);
    }
    [Fact] public void InvalidRefreshRetainsLastGoodSnapshot()
    {
        var path=Path.GetTempFileName();
        try {
            File.Copy(Path.Combine(AppContext.BaseDirectory,"Data","catalog.json"),path,true);
            var c=new CatalogService(path);var before=c.Snapshot;
            File.WriteAllText(path,"{}");File.SetLastWriteTimeUtc(path,DateTime.UtcNow.AddSeconds(2));
            Assert.Same(before,c.Snapshot);Assert.NotNull(c.RefreshError);
        } finally {File.Delete(path);}
    }
    [Fact] public void BaselineContextRemainsIndependent()
    {
        var e=Catalog().Evaluate(new(new(){ContextTokens=8192},new(){ContextTokens=4096}),engine);
        Assert.Equal(4096,e.Baseline!.ContextTokens);
        Assert.All(e.Artifacts,a=>Assert.Equal(a.Baseline!.CacheGiB*2,a.Scenario.CacheGiB));
    }
}
