using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace ModelAtlas.Api;

// Local CLI only: no endpoint, catalog mutation, inference, or request/body logging.
public sealed class HuggingFaceProbe(HttpClient client, string? token)
{
    const string Hub = "https://huggingface.co";
    const string Viewer = "https://datasets-server.huggingface.co";
    readonly List<object> observations = [];
    bool rateLimited;
    public IReadOnlyList<object> Observations => observations;

    public static async Task<int> RunCommand(string[] args)
    {
        if (args.Length != 2 || args[1] is not ("all" or "hub" or "gguf" or "benchmarks"))
        {
            Console.WriteLine("Usage: --probe-hf all|hub|gguf|benchmarks (no token arguments)");
            return 2;
        }
        string? secret = null;
        try
        {
            // Explicit for the CLI, which runs without a web host or Development environment.
            var config = new ConfigurationBuilder().SetBasePath(AppContext.BaseDirectory)
                .AddJsonFile("appsettings.json").AddUserSecrets<Program>(optional: true)
                .AddEnvironmentVariables().Build();
            secret = config["HuggingFace:Token"]?.Trim();
            if (secret?.Length == 0) secret = null;
            if (secret is not null && !Regex.IsMatch(secret, "^hf_[A-Za-z0-9]+$"))
            {
                Console.WriteLine("{\"status\":\"invalid_credential_format\"}");
                return 2;
            }
            using var client = new HttpClient(new HttpClientHandler { AllowAutoRedirect = false, UseCookies = false })
            { Timeout = TimeSpan.FromSeconds(30) };
            var probe = new HuggingFaceProbe(client, secret);
            var catalog = new CatalogService(Path.Combine(AppContext.BaseDirectory, "Data", "catalog.json")).Snapshot;
            var model = config["HuggingFace:ProbeModel"] ?? "";
            var release = catalog.Releases.FirstOrDefault(r => r.ReleaseIdentifier == model)
                ?? throw new ProbeFailure("probe_model_not_in_catalog");
            var authentication = secret is null ? "missing_credentials_public_only" : "not_checked";
            var failed = false;
            if (secret is not null)
            {
                try
                {
                    await probe.Json("authentication", Hub + "/api/whoami-v2");
                    authentication = "authenticated";
                }
                catch (ProbeFailure e) { authentication = e.Status; failed = true; }
            }
            if (!failed)
                foreach (var source in args[1] == "all" ? new[] { "hub", "gguf", "benchmarks" } : [args[1]])
                {
                    try
                    {
                        switch (source)
                        {
                            case "hub": await probe.HubProbe(release); break;
                            case "gguf": await probe.GgufProbe(catalog.Artifacts.First(a => a.ReleaseId == release.Id)); break;
                            case "benchmarks": await probe.BenchmarkProbe(config, catalog); break;
                        }
                    }
                    catch (ProbeFailure e) { probe.observations.Add(new { source, outcome = e.Status }); failed = true; }
                    catch (Exception) { probe.observations.Add(new { source, outcome = "unexpected_response_or_local_error" }); failed = true; }
                }
            var report = new { retrievedAt = DateTimeOffset.UtcNow, authentication, mode = args[1],
                catalogReleases = catalog.Releases.Count, observations = probe.observations };
            Console.WriteLine(Redact(JsonSerializer.Serialize(report, new JsonSerializerOptions { WriteIndented = true }), secret));
            return failed ? 1 : secret is null ? 2 : 0;
        }
        catch (Exception)
        {
            // Configuration/transport exception messages can include secrets, paths or signed URLs.
            Console.WriteLine("{\"status\":\"configuration_or_local_error\",\"detail\":\"Check local configuration and catalog; exception details suppressed.\"}");
            return 1;
        }
    }

    public static string Redact(string text, string? secret) => Regex.Replace(
        string.IsNullOrEmpty(secret) ? text : text.Replace(secret, "[redacted]", StringComparison.Ordinal),
        @"hf_[A-Za-z0-9]+", "[redacted]");

    public static string Classify(int status, bool hasToken, bool identity = false) => status switch
    {
        401 when identity && hasToken => "invalid_or_expired_credentials",
        401 when !hasToken => "credentials_required_or_private_resource",
        401 => "resource_access_denied",
        403 => "permission_denied", // Not evidence of a paid-plan restriction.
        402 => "payment_required_no_paid_fallback",
        404 => "not_found_or_hidden", // Private repositories may deliberately appear absent.
        429 => "rate_limited",
        >= 500 => "upstream_unavailable",
        _ => "http_error"
    };

    static string PathPart(string value) => string.Join('/', value.Split('/').Select(Uri.EscapeDataString));
    static bool ApiHost(Uri uri) => uri.Scheme == "https" && uri.Port == 443 && uri.UserInfo == "" &&
        uri.Host is "huggingface.co" or "datasets-server.huggingface.co";
    static bool DownloadHost(Uri uri) => uri.Scheme == "https" && uri.Port == 443 && uri.UserInfo == "" &&
        (ApiHost(uri) || uri.Host.EndsWith(".hf.co", StringComparison.Ordinal) || uri.Host == "cdn-lfs.huggingface.co");

    internal async Task<(byte[] Body, string? Link)> Get(string label, string url, int limit = 2 * 1024 * 1024, bool range = false)
    {
        if (rateLimited) throw new ProbeFailure("skipped_after_rate_limit");
        var uri = new Uri(url);
        if (!ApiHost(uri)) throw new ProbeFailure("untrusted_api_host");
        try
        {
            using var deadline = new CancellationTokenSource(TimeSpan.FromSeconds(30));
            for (var redirect = 0; redirect < 6; redirect++)
            {
                using var request = new HttpRequestMessage(HttpMethod.Get, uri);
                request.Headers.UserAgent.ParseAdd("ModelAtlas-source-probe/1.0");
                // Never forward the bearer credential to a CDN or signed download URL.
                if (ApiHost(uri) && uri.Host == new Uri(url).Host && token is not null)
                    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
                if (range) request.Headers.Range = new RangeHeaderValue(0, limit - 1);
                using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, deadline.Token);
                string? Header(string name) => response.Headers.TryGetValues(name, out var values) ? string.Join(", ", values) : null;
                var status = (int)response.StatusCode;
                observations.Add(new { request = label, httpStatus = status, hop = redirect,
                    rateLimit = Header("RateLimit"), rateLimitPolicy = Header("RateLimit-Policy"), retryAfter = Header("Retry-After") });
                if (status is 301 or 302 or 303 or 307 or 308)
                {
                    var location = response.Headers.Location ?? throw new ProbeFailure("missing_redirect_location");
                    uri = new Uri(uri, location);
                    if (!DownloadHost(uri)) throw new ProbeFailure("untrusted_redirect_host");
                    continue;
                }
                if (!response.IsSuccessStatusCode)
                {
                    rateLimited |= status == 429;
                    throw new ProbeFailure(Classify(status, token is not null, label == "authentication"));
                }
                if (range && (status != 206 || response.Content.Headers.ContentRange?.From != 0 ||
                    response.Content.Headers.ContentRange?.Unit != "bytes" || response.Content.Headers.ContentRange?.To >= limit))
                    throw new ProbeFailure("bounded_range_not_honored");
                if (response.Content.Headers.ContentLength > limit) throw new ProbeFailure("response_too_large");
                await using var stream = await response.Content.ReadAsStreamAsync(deadline.Token);
                using var output = new MemoryStream();
                var buffer = new byte[8192];
                int count;
                while ((count = await stream.ReadAsync(buffer.AsMemory(0, Math.Min(buffer.Length, limit + 1 - (int)output.Length)), deadline.Token)) > 0)
                {
                    output.Write(buffer, 0, count);
                    if (output.Length > limit) throw new ProbeFailure("response_too_large");
                }
                return (output.ToArray(), Header("Link"));
            }
            throw new ProbeFailure("too_many_redirects");
        }
        catch (HttpRequestException) { throw new ProbeFailure("network_error"); }
        catch (OperationCanceledException) { throw new ProbeFailure("timeout"); }
    }

    async Task<(JsonElement Data, string? Link)> Json(string label, string url)
    {
        var result = await Get(label, url);
        try { using var doc = JsonDocument.Parse(result.Body); return (doc.RootElement.Clone(), result.Link); }
        catch (JsonException) { throw new ProbeFailure("invalid_json"); }
    }

    public static JsonElement Field(JsonElement element, string path)
    {
        foreach (var key in path.Split('.'))
            if (element.ValueKind != JsonValueKind.Object || !element.TryGetProperty(key, out element)) return default;
        return element;
    }
    public static string FieldState(JsonElement value) => value.ValueKind switch
    {
        JsonValueKind.Undefined => "absent", JsonValueKind.Null => "null",
        JsonValueKind.Array when value.GetArrayLength() == 0 => "empty",
        JsonValueKind.String when value.GetString() == "" => "empty",
        _ => "present"
    };
    void Inspect(string label, JsonElement data, params string[] fields) => observations.Add(new {
        inspection = label,
        availableFields = data.ValueKind == JsonValueKind.Object ? data.EnumerateObject().Select(p => p.Name).ToArray() : [],
        fields = fields.ToDictionary(f => f, f => FieldState(Field(data, f))),
        values = fields.Where(f => FieldState(Field(data, f)) == "present")
            .Where(f => !f.EndsWith("url", StringComparison.OrdinalIgnoreCase))
            .Where(f => Field(data, f).ValueKind is not (JsonValueKind.Array or JsonValueKind.Object))
            .ToDictionary(f => f, f => Field(data, f))
    });

    public static string? NextPage(string? link, string original)
    {
        if (link is null) return null;
        var match = Regex.Match(link, "<([^>]+)>;\\s*rel=\"?next\"?");
        if (!match.Success) return null;
        var next = new Uri(new Uri(original), match.Groups[1].Value);
        var start = new Uri(original);
        if (!ApiHost(next) || next.Host != start.Host || next.AbsolutePath != start.AbsolutePath)
            throw new ProbeFailure("untrusted_pagination_link");
        return next.AbsoluteUri;
    }

    async Task HubProbe(ModelRelease release)
    {
        var url = Hub + "/api/models?limit=2&search=" + Uri.EscapeDataString(release.ReleaseIdentifier);
        var page = await Json("hub.list.page1", url);
        var next = NextPage(page.Link, url);
        var count2 = next is null ? 0 : (await Json("hub.list.page2", next)).Data.GetArrayLength();
        observations.Add(new { source = "hub", pagination = "Link rel=next; at most two pages", page1 = page.Data.GetArrayLength(), page2 = count2, nextLink = next is not null });
        var model = (await Json("hub.model", Hub + "/api/models/" + PathPart(release.ReleaseIdentifier) + "?blobs=true")).Data;
        Inspect("hub.model", model, "id", "sha", "gated", "downloads", "likes", "cardData.license", "cardData.base_model",
            "safetensors.total", "model-index", "config", "siblings");
        var revision = Field(model, "sha").GetString() ?? throw new ProbeFailure("missing_revision");
        var config = (await Json("hub.config", Hub + "/" + PathPart(release.ReleaseIdentifier) + "/resolve/" + PathPart(revision) + "/config.json")).Data;
        Inspect("hub.config", config, "model_type", "num_hidden_layers", "hidden_size", "num_attention_heads", "num_key_value_heads", "head_dim", "max_position_embeddings", "num_experts", "num_experts_per_tok", "sliding_window", "use_sliding_window");
        observations.Add(new { inspection = "hub.evaluation_files", count = Field(model, "siblings").EnumerateArray()
            .Count(f => Field(f, "rfilename").GetString()?.StartsWith(".eval_results/", StringComparison.Ordinal) == true) });
    }

    async Task GgufProbe(ModelArtifact artifact)
    {
        var meta = (await Json("gguf.repository", Hub + "/api/models/" + PathPart(artifact.Repository) + "/revision/" + PathPart(artifact.Revision) + "?blobs=true")).Data;
        Inspect("gguf.repository", meta, "id", "sha", "cardData.base_model", "gguf", "siblings");
        var file = artifact.Files[0];
        var sibling = Field(meta, "siblings").EnumerateArray().FirstOrDefault(f => Field(f, "rfilename").GetString() == file.Path);
        Inspect("gguf.file", sibling, "rfilename", "size", "lfs.sha256");
        var url = Hub + "/" + PathPart(artifact.Repository) + "/resolve/" + PathPart(artifact.Revision) + "/" + PathPart(file.Path);
        var response = await Get("gguf.header", url, 512 * 1024, range: true);
        var header = GgufMetadata.Read(response.Body);
        if (!header.Complete)
        {
            response = await Get("gguf.header.extended", url, 8 * 1024 * 1024, range: true);
            header = GgufMetadata.Read(response.Body);
        }
        observations.Add(new { source = "gguf", artifact.Id, artifact.Revision, file.Path, bytesRead = response.Body.Length,
            metadataComplete = header.Complete, fields = header.Fields,
            pagination = "not applicable to binary header; repository siblings from pinned detail response",
            expectedQuantization = artifact.Quantization,
            missingFields = new[] { "general.architecture", "general.file_type" }.Except(header.Fields.Keys).ToArray() });
        if (!header.Complete) throw new ProbeFailure("metadata_exceeds_8MiB_probe_limit");
    }

    async Task BenchmarkProbe(IConfiguration config, CatalogSnapshot catalog)
    {
        var dataset = config["HuggingFace:BenchmarkDataset"] ?? "";
        var task = config["HuggingFace:BenchmarkTask"] ?? "mmlu_pro";
        var data = (await Json("benchmarks.leaderboard", Hub + "/api/datasets/" + PathPart(dataset) + "/leaderboard?task_id=" + Uri.EscapeDataString(task))).Data;
        var rows = data.EnumerateArray().ToArray();
        var ids = catalog.Releases.Select(r => r.ReleaseIdentifier).ToHashSet(StringComparer.Ordinal);
        var matches = rows.Where(r => ids.Contains(Field(r, "modelId").GetString() ?? "")).ToArray();
        observations.Add(new { source = "benchmarks", dataset, task, returnedRows = rows.Length,
            matchedCatalogModels = matches.Select(r => Field(r, "modelId").GetString()).Distinct().Count(),
            pagination = "No pagination parameters documented for this endpoint; coverage refers only to returned rows",
            catalogModelsNotInReturnedRows = ids.Except(matches.Select(r => Field(r, "modelId").GetString()!)).Order().ToArray(),
            outcome = rows.Length == 0 ? "no_results_for_dataset_task_check_task_id" : "available" });
        foreach (var row in matches.Take(10))
            Inspect("benchmarks.catalog_match", row, "modelId", "value", "verified", "filename", "source.url", "pullRequest", "lower_is_better", "revision", "precision", "date", "tokens_per_second");
        if (rows.Length > 0 && matches.Length == 0) Inspect("benchmarks.sample", rows[0], "modelId", "value", "verified", "filename", "revision", "precision");
        // The older HF leaderboard is a separate dataset and protocol, not interchangeable scores.
        var legacy = config["HuggingFace:LegacyBenchmarkDataset"] ?? "";
        var prefix = Viewer + "/rows?dataset=" + Uri.EscapeDataString(legacy);
        var splits = (await Json("benchmarks.legacy.splits", Viewer + "/splits?dataset=" + Uri.EscapeDataString(legacy))).Data;
        var split = Field(splits, "splits").EnumerateArray().FirstOrDefault();
        if (split.ValueKind == JsonValueKind.Undefined) throw new ProbeFailure("no_available_dataset_split");
        prefix += "&config=" + Uri.EscapeDataString(Field(split, "config").GetString()!) + "&split=" + Uri.EscapeDataString(Field(split, "split").GetString()!);
        var first = (await Json("benchmarks.legacy.page1", prefix + "&offset=0&length=2")).Data;
        var second = (await Json("benchmarks.legacy.page2", prefix + "&offset=2&length=2")).Data;
        observations.Add(new { inspection = "benchmarks.legacy.pagination", dataset = legacy, total = Field(first, "num_rows_total"),
            page1Indices = Field(first, "rows").EnumerateArray().Select(r => Field(r, "row_idx")).ToArray(),
            page2Indices = Field(second, "rows").EnumerateArray().Select(r => Field(r, "row_idx")).ToArray(), partial = Field(first, "partial"),
            fields = Field(first, "features").EnumerateArray().Select(f => Field(f, "name").GetString()).ToArray(),
            coverage = "Four sampled rows only; no full catalog coverage claim" });
        var example = Field(first, "rows").EnumerateArray().FirstOrDefault();
        if (example.ValueKind != JsonValueKind.Undefined)
            Inspect("benchmarks.legacy.sample", Field(example, "row"), "fullname", "Model sha", "Precision", "IFEval Raw", "BBH Raw", "MATH Lvl 5 Raw", "GPQA Raw", "MUSR Raw", "MMLU-PRO Raw", "Flagged", "Submission Date", "tokens_per_second");
        var model = config["HuggingFace:ProbeModel"]!;
        var where = "\"fullname\"='" + model.Replace("'", "''") + "'";
        var filtered = (await Json("benchmarks.legacy.model", prefix.Replace("/rows?", "/filter?") + "&where=" + Uri.EscapeDataString(where) + "&offset=0&length=2")).Data;
        observations.Add(new { inspection = "benchmarks.legacy.model_matches", model, total = Field(filtered, "num_rows_total"),
            expectedRevision = catalog.Releases.First(r => r.ReleaseIdentifier == model).Revision });
        foreach (var row in Field(filtered, "rows").EnumerateArray())
            Inspect("benchmarks.legacy.model", Field(row, "row"), "fullname", "Model sha", "Precision", "IFEval Raw", "BBH Raw", "MATH Lvl 5 Raw", "GPQA Raw", "MUSR Raw", "MMLU-PRO Raw", "Flagged", "Submission Date");
    }
}

public sealed class ProbeFailure(string status) : Exception(status)
{
    public string Status { get; } = status;
}
