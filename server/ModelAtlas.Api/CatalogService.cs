using System.Text.Json;
namespace ModelAtlas.Api;

public sealed class CatalogService
{
    readonly string path;
    readonly object sync = new();
    CatalogSnapshot snapshot;
    DateTime lastWrite;
    public string? RefreshError { get; private set; }
    public CatalogSnapshot Snapshot {
        get {
            lock (sync) {
                var modified = File.GetLastWriteTimeUtc(path);
                if (modified != lastWrite) {
                    try { var next = Read(path); snapshot = next; lastWrite = modified; RefreshError = null; }
                    catch (Exception e) when (e is IOException or JsonException or InvalidDataException or ArgumentException or UnauthorizedAccessException) {
                        RefreshError = "Updated catalog rejected; the last valid snapshot remains active.";
                    }
                }
                return snapshot;
            }
        }
    }
    public CatalogService(string path)
    {
        this.path = path;
        snapshot = Read(path);
        lastWrite = File.GetLastWriteTimeUtc(path);
    }
    static CatalogSnapshot Read(string path)
    {
        var snapshot = JsonSerializer.Deserialize<CatalogSnapshot>(File.ReadAllText(path), new JsonSerializerOptions(JsonSerializerDefaults.Web))
            ?? throw new InvalidDataException("Catalog is empty.");
        Validate(snapshot);
        return snapshot;
    }
    public static void Validate(CatalogSnapshot snapshot)
    {
        if (snapshot.SchemaVersion != 3 || snapshot.Releases is not { Count: > 0 } || snapshot.Artifacts is not { Count: > 0 } ||
            snapshot.Releases.Any(r => r is null) || snapshot.Artifacts.Any(a => a is null || a.Files is null || a.Files.Any(f => f is null)))
            throw new InvalidDataException("Catalog schema or coverage is invalid.");
        if (snapshot.Releases.Select(x => x.Id).Distinct().Count() != snapshot.Releases.Count ||
            snapshot.Artifacts.Select(x => x.Id).Distinct().Count() != snapshot.Artifacts.Count ||
            snapshot.Artifacts.Any(a => !snapshot.Releases.Any(r => r.Id == a.ReleaseId && r.ReleaseIdentifier == a.SourceModel) || string.IsNullOrWhiteSpace(a.MappingVerification) || a.Files is not { Count: > 0 } || a.Files.Sum(f => (decimal)f.SizeBytes) != a.SizeBytes || a.SizeBytes <= 0 ||
                !Hash(a.Revision,40) || a.Format != "GGUF" || !new Dictionary<string,int>{{"Q4_K_M",15},{"Q5_K_M",17},{"Q8_0",7}}.TryGetValue(a.Quantization,out var kind) || kind!=a.GgufFileType ||
                a.SourceUrl != $"https://huggingface.co/{a.Repository}/tree/{a.Revision}" ||
                a.Files.Any(f => f.SizeBytes<=0 || !Hash(f.Sha256,64) || f.Url?.StartsWith($"https://huggingface.co/{a.Repository}/resolve/{a.Revision}/",StringComparison.Ordinal)!=true)))
            throw new InvalidDataException("Catalog identities/file sets are inconsistent.");
        foreach (var r in snapshot.Releases) {
            var b = r.ReferenceQuality; var a = r.Architecture;
            var q = r.QualityRating;
            if (q is null || !double.IsFinite(q.Score) || q.Score < 0 || q.Score > 100 || q.Basis is not ("reference-benchmark" or "external-curated") ||
                q.SourceUrl?.StartsWith("https://",StringComparison.Ordinal)!=true || q.AsOf == default || string.IsNullOrWhiteSpace(q.Note) ||
                r.Tasks is not { Count: > 0 } || r.Tasks.Any(t => t is not ("Chat" or "Coding" or "Reasoning" or "Agentic")) || r.TaskSource?.StartsWith("https://",StringComparison.Ordinal)!=true ||
                (q.Basis == "reference-benchmark" && (b is null || Math.Abs(q.Score - b.Score)>1e-8)))
                throw new InvalidDataException("Catalog quality input or task provenance is invalid.");
            if (b is not null && (b.Suite != Estimator.Suite || b.Values is not { Count:2 } || b.Values.Any(v => !double.IsFinite(v) || v<0 || v>1) ||
                !double.IsFinite(b.Score) || Math.Abs(b.Score - 50*b.Values.Sum())>1e-8 || !Hash(b.ModelRevision,40) || !Hash(b.SourceRevision,40) ||
                b.ConditionsHash != Estimator.ConditionsHash || string.IsNullOrWhiteSpace(b.HarnessRevision) || b.SourceUrl?.StartsWith($"https://huggingface.co/datasets/open-llm-leaderboard/results/resolve/{b.SourceRevision}/",StringComparison.Ordinal)!=true ||
                b.EvaluatedAt == default || b.EvaluatedAt>b.RetrievedAt))
                throw new InvalidDataException("Catalog reference evaluation is invalid.");
            if (!Hash(r.Revision,40) || a is null || !Estimator.Supported.Contains(a.Type ?? "") || a.Experts>1 ||
                a.Layers is null or <=0 || a.HiddenSize is null or <=0 || a.AttentionHeads is null or <=0 || a.KvHeads is null or <=0 || a.HeadDim is null or <=0 ||
                r.ContextLimit is null or <=0 || r.TotalParameters is null or <=0 || string.IsNullOrWhiteSpace(r.License) || !snapshot.Artifacts.Any(v => v.ReleaseId == r.Id))
                throw new InvalidDataException("Catalog release is missing comparable evidence or supported architecture metadata.");
        }
    }
    static bool Hash(string? value,int length) => value?.Length==length && value.All(c => char.IsAsciiHexDigit(c));
    static bool Feasible(Estimate e) => e.Eligible;
    public EvaluationResponse Evaluate(EvaluationRequest request, Estimator estimator)
    {
        var current = Snapshot;
        var artifacts = current.Artifacts.Select(a => {
            var r = current.Releases.First(r => r.Id == a.ReleaseId);
            return new ArtifactEvaluation(a.Id, estimator.Evaluate(r, a, request.Settings),
                request.Baseline is null ? null : estimator.Evaluate(r, a, request.Baseline));
        }).ToList();
        ModelArtifact Choose(string id, bool baseline) => current.Artifacts.Where(a => a.ReleaseId == id)
            .OrderByDescending(a => (baseline ? artifacts.First(x => x.ArtifactId == a.Id).Baseline : artifacts.First(x => x.ArtifactId == a.Id).Scenario)?.Eligible ?? false)
            .ThenByDescending(a => (baseline ? artifacts.First(x => x.ArtifactId == a.Id).Baseline : artifacts.First(x => x.ArtifactId == a.Id).Scenario)?.SuitabilityScore ?? -1)
            .ThenByDescending(a => (baseline ? artifacts.First(x => x.ArtifactId == a.Id).Baseline : artifacts.First(x => x.ArtifactId == a.Id).Scenario)?.Status == "gpu-fit")
            .ThenByDescending(a => (baseline ? artifacts.First(x => x.ArtifactId == a.Id).Baseline : artifacts.First(x => x.ArtifactId == a.Id).Scenario)?.Speed?.Typical ?? -1)
            .ThenBy(a => a.SizeBytes).ThenBy(a => a.Id).First();
        var points = current.Releases.Select(r => {
            var a = Choose(r.Id,false);
            var b = request.Baseline is null ? null : Choose(r.Id,true);
            var now = artifacts.First(x => x.ArtifactId == a.Id).Scenario;
            var before = b is null ? null : artifacts.First(x => x.ArtifactId == b.Id).Baseline;
            string change = before is null ? "none" : now.Status == "unknown" || before.Status == "unknown" ? "uncertain" :
                Feasible(now) && !Feasible(before) ? "gained" : !Feasible(now) && Feasible(before) ? "lost" : "stable";
            return new ReleaseEvaluation(r.Id, a.Id, b?.Id, now, before, change, b is not null && a.Id != b.Id,
                request.Settings.Quantization == "smallest" || a.Quantization == request.Settings.Quantization);
        }).ToList();
        points = points.OrderByDescending(p => p.Scenario.Eligible)
            .ThenByDescending(p => p.Scenario.SuitabilityScore ?? -1)
            .ThenByDescending(p => p.Scenario.Speed?.Typical ?? -1)
            .ThenBy(p => p.ReleaseId, StringComparer.Ordinal).ToList();
        return new(request.Settings, request.Baseline, points, artifacts, Estimator.Version);
    }
}
