namespace ModelAtlas.Api;

public sealed record CatalogSnapshot(int SchemaVersion, string ImporterVersion, DateTimeOffset RetrievedAt,
    List<ModelRelease> Releases, List<ModelArtifact> Artifacts, List<ImportIssue> ImportIssues);
public sealed record ImportIssue(string Repository, string Reason);
public sealed record Architecture(string? Type, int? Layers, int? HiddenSize, int? AttentionHeads, int? KvHeads,
    int? HeadDim, int? Experts, int? ExpertsPerToken, int? SlidingWindow, string SourceUrl);
public sealed record ModelRelease(string Id, string Name, string Publisher, string Family, string ReleaseIdentifier,
    bool? InstructionTuned, long? TotalParameters, long? ActiveParameters, Architecture Architecture, int? ContextLimit, string ContextSource,
    string? License, string LicenseUrl, string ModelCardUrl, string Revision, DateTimeOffset RetrievedAt,
    string ValidationStatus, List<string> MissingFields);
public sealed record ArtifactFile(string Path, long SizeBytes, string Sha256, string Url);
public sealed record ModelArtifact(string Id, string ReleaseId, string Repository, string Revision, string Quantization,
    int GgufFileType, string Format, long SizeBytes, List<ArtifactFile> Files, string SourceUrl,
    string ValidationStatus, List<string> MissingFields, DateTimeOffset RetrievedAt);
public sealed record HardwareSettings
{
    public double GpuGiB { get; init; } = 12;
    public double RamGiB { get; init; } = 32;
    public int ContextTokens { get; init; } = 8192;
    public string Quantization { get; init; } = "Q4_K_M";
    public bool AllowOffload { get; init; } = true;
    public string CachePrecision { get; init; } = "f16";
    public int Concurrency { get; init; } = 1;
}
public sealed record Estimate(string ArtifactId, string Status, double? WeightsGiB, double? CacheGiB,
    double? RuntimeGiB, double? SafetyGiB, double? TotalGiB, double? GpuRequiredGiB, double? SystemRequiredGiB,
    bool? ContextSatisfied, string EstimatorVersion, string RuntimeCompatibility,
    List<string> Assumptions, List<string> Reasons);
public sealed record ArtifactEvaluation(string ArtifactId, Estimate Scenario, Estimate? Baseline);
public sealed record ReleaseEvaluation(string ReleaseId, string ArtifactId, string? BaselineArtifactId,
    Estimate Scenario, Estimate? Baseline, string Change, bool RepresentativeChanged, bool PreferenceMatched);
public sealed record EvaluationRequest(HardwareSettings Settings, HardwareSettings? Baseline);
public sealed record EvaluationResponse(HardwareSettings Settings, HardwareSettings? Baseline,
    List<ReleaseEvaluation> Releases, List<ArtifactEvaluation> Artifacts, string EstimatorVersion);
