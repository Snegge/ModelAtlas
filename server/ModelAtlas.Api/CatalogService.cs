using System.Text.Json;
namespace ModelAtlas.Api;

public sealed class CatalogService
{
    public CatalogSnapshot Snapshot { get; }
    public CatalogService(string path)
    {
        Snapshot = JsonSerializer.Deserialize<CatalogSnapshot>(File.ReadAllText(path), new JsonSerializerOptions(JsonSerializerDefaults.Web))
            ?? throw new InvalidDataException("Catalog is empty.");
        if (Snapshot.SchemaVersion != 1 || Snapshot.Releases.Count == 0 || Snapshot.Artifacts.Count == 0)
            throw new InvalidDataException("Catalog schema or coverage is invalid.");
        if (Snapshot.Releases.Select(x => x.Id).Distinct().Count() != Snapshot.Releases.Count ||
            Snapshot.Artifacts.Select(x => x.Id).Distinct().Count() != Snapshot.Artifacts.Count ||
            Snapshot.Artifacts.Any(a => !Snapshot.Releases.Any(r => r.Id == a.ReleaseId) || a.Files.Count == 0 || a.Files.Sum(f => f.SizeBytes) != a.SizeBytes))
            throw new InvalidDataException("Catalog identities/file sets are inconsistent.");
    }
    public ModelArtifact Representative(string releaseId, string preference) => Snapshot.Artifacts
        .Where(a => a.ReleaseId == releaseId)
        .OrderBy(a => preference != "smallest" && a.Quantization == preference ? 0 : 1)
        .ThenBy(a => a.SizeBytes).First();
    static bool Feasible(Estimate e) => e.Status is "gpu-fit" or "offload";
    public EvaluationResponse Evaluate(EvaluationRequest request, Estimator estimator)
    {
        var artifacts = Snapshot.Artifacts.Select(a => {
            var r = Snapshot.Releases.First(r => r.Id == a.ReleaseId);
            return new ArtifactEvaluation(a.Id, estimator.Evaluate(r, a, request.Settings),
                request.Baseline is null ? null : estimator.Evaluate(r, a, request.Baseline));
        }).ToList();
        var points = Snapshot.Releases.Select(r => {
            var a = Representative(r.Id, request.Settings.Quantization);
            var b = request.Baseline is null ? null : Representative(r.Id, request.Baseline.Quantization);
            var now = artifacts.First(x => x.ArtifactId == a.Id).Scenario;
            var before = b is null ? null : artifacts.First(x => x.ArtifactId == b.Id).Baseline;
            string change = before is null ? "none" : now.Status == "unknown" || before.Status == "unknown" ? "uncertain" :
                Feasible(now) && !Feasible(before) ? "gained" : !Feasible(now) && Feasible(before) ? "lost" : "stable";
            return new ReleaseEvaluation(r.Id, a.Id, b?.Id, now, before, change, b is not null && a.Id != b.Id,
                request.Settings.Quantization == "smallest" || a.Quantization == request.Settings.Quantization);
        }).ToList();
        return new(request.Settings, request.Baseline, points, artifacts, Estimator.Version);
    }
}
