using ModelAtlas.Api;

if (args.Length > 0 && args[0] == "--probe-hf")
{
    Environment.ExitCode = await HuggingFaceProbe.RunCommand(args);
    return;
}

var builder = WebApplication.CreateBuilder(args);
var sourceCatalog = Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, "../../data/catalog.json"));
builder.Services.AddSingleton(new CatalogService(builder.Configuration["Catalog:Path"] ??
    (File.Exists(sourceCatalog) ? sourceCatalog : Path.Combine(AppContext.BaseDirectory, "Data", "catalog.json"))));
builder.Services.AddSingleton<Estimator>();
var app = builder.Build();
app.MapGet("/api/health", () => Results.Ok(new { status = "ok", estimatorVersion = Estimator.Version }));
app.MapGet("/api/catalog", (CatalogService catalog, string? search, string? family, string? quantization) =>
{
    var snapshot = catalog.Snapshot;
    var releases = snapshot.Releases.Where(r =>
        (string.IsNullOrWhiteSpace(search) || (r.Name + " " + r.Publisher).Contains(search, StringComparison.OrdinalIgnoreCase)) &&
        (string.IsNullOrWhiteSpace(family) || r.Family == family) &&
        (string.IsNullOrWhiteSpace(quantization) || snapshot.Artifacts.Any(a => a.ReleaseId == r.Id && a.Quantization == quantization))).ToList();
    var ids = releases.Select(r => r.Id).ToHashSet();
    return Results.Ok(new { releases, artifacts = snapshot.Artifacts.Where(a => ids.Contains(a.ReleaseId)) });
});
app.MapGet("/api/models/{id}", (string id, CatalogService catalog) =>
{
    var snapshot = catalog.Snapshot;
    var release = snapshot.Releases.FirstOrDefault(x => x.Id == id);
    return release is null ? Results.NotFound() : Results.Ok(new { release, artifacts = snapshot.Artifacts.Where(x => x.ReleaseId == id) });
});
app.MapGet("/api/artifacts/{id}", (string id, CatalogService catalog) =>
{
    var snapshot = catalog.Snapshot;
    var artifact = snapshot.Artifacts.FirstOrDefault(x => x.Id == id);
    return artifact is null ? Results.NotFound() : Results.Ok(new { artifact, release = snapshot.Releases.First(x => x.Id == artifact.ReleaseId) });
});
app.MapPost("/api/evaluate", (EvaluationRequest request, CatalogService catalog, Estimator estimator) =>
{
    if (request.Settings is null) return Results.BadRequest(new { errors = new[] { "Settings are required." } });
    var errors = Estimator.Validate(request.Settings);
    if (request.Baseline is not null) errors.AddRange(Estimator.Validate(request.Baseline));
    return errors.Count > 0 ? Results.BadRequest(new { errors }) : Results.Ok(catalog.Evaluate(request, estimator));
});
app.MapPost("/api/scenarios", (EvaluationRequest request, CatalogService catalog, Estimator estimator) =>
{
    if (request.Settings is null) return Results.BadRequest(new { errors = new[] { "Settings are required." } });
    var errors = Estimator.Validate(request.Settings);
    if (request.Baseline is not null) errors.AddRange(Estimator.Validate(request.Baseline));
    return errors.Count > 0 ? Results.BadRequest(new { errors }) : Results.Ok(catalog.Evaluate(request, estimator));
});
app.MapGet("/api/catalog/status", (CatalogService c) => Results.Ok(new {
    c.Snapshot.RetrievedAt, c.Snapshot.ImporterVersion, estimatorVersion = Estimator.Version,
    releaseCount = c.Snapshot.Releases.Count, artifactCount = c.Snapshot.Artifacts.Count,
    families = c.Snapshot.Releases.GroupBy(r => r.Family).Select(g => new { name = g.Key, count = g.Count() }),
    quantizations = c.Snapshot.Artifacts.Select(a => a.Quantization).Distinct(),
    incompleteReleases = c.Snapshot.Releases.Count(r => r.MissingFields.Count > 0),
    c.Snapshot.ImportIssues, c.RefreshError, source = "Validated, revision-pinned Hugging Face snapshot; refreshed atomically by scripts/curate_catalog.py."
}));
app.Run();
public partial class Program;
