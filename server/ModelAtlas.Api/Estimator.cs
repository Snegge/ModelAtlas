namespace ModelAtlas.Api;

/// <summary>Dedicated single-GPU memory planning, not a runtime compatibility or performance predictor.</summary>
public sealed class Estimator
{
    public const string Version = "dedicated-gpu/1.0.0";
    const double GiB = 1024.0 * 1024 * 1024;
    static readonly HashSet<string> Supported = ["llama", "mistral", "qwen2", "qwen3", "gemma", "gemma2", "phi3", "phi", "gemma3_text"];

    public static List<string> Validate(HardwareSettings s)
    {
        List<string> errors = [];
        if (!double.IsFinite(s.GpuGiB) || s.GpuGiB < 0 || s.GpuGiB > 192) errors.Add("GPU memory must be 0–192 GiB.");
        if (!double.IsFinite(s.RamGiB) || s.RamGiB < 1 || s.RamGiB > 1024) errors.Add("System memory must be 1–1024 GiB.");
        if (s.ContextTokens < 256 || s.ContextTokens > 1048576) errors.Add("Context must be 256–1,048,576 tokens.");
        if (s.CachePrecision is not ("f16" or "f32")) errors.Add("Cache precision must be f16 or f32.");
        if (s.Concurrency is < 1 or > 8) errors.Add("Concurrency must be 1–8 sequences.");
        if (s.Quantization is not ("Q4_K_M" or "Q5_K_M" or "Q8_0" or "smallest")) errors.Add("Unknown quantization preference.");
        return errors;
    }

    public Estimate Evaluate(ModelRelease model, ModelArtifact artifact, HardwareSettings s)
    {
        var a = model.Architecture;
        List<string> assumptions = [
            "Single dedicated GPU; system RAM and VRAM are separate pools. No unified-memory or CPU-only prediction.",
            "Actual complete GGUF file bytes approximate resident weights; mappings and tensor placement vary by runtime.",
            $"Full-length KV cache; {s.CachePrecision.ToUpperInvariant()}, {s.Concurrency} concurrent sequence(s).",
            "Runtime/compute overhead = 0.75 GiB + 5% of weights. Safety allowance = 10% of weights + cache + overhead.",
            "Offloading keeps the full cache/overhead on GPU and divides weights only; RAM holds offloaded weights plus a 2 GiB host reserve."
        ];
        List<string> reasons = [];
        if (!Supported.Contains(a.Type ?? "")) reasons.Add($"Architecture '{a.Type ?? "unknown"}' is outside the supported conventional-transformer subset.");
        if (a.Experts > 1) reasons.Add("Mixture-of-experts cache/placement is not supported; total stored weights are never replaced by active parameters.");
        if (a.Layers is null or <= 0 || a.KvHeads is null or <= 0 || a.HeadDim is null or <= 0)
            reasons.Add("Missing valid layer count, KV head count or head dimension.");
        if (artifact.SizeBytes <= 0 || artifact.Files.Count == 0 || artifact.Files.Sum(f => f.SizeBytes) != artifact.SizeBytes)
            reasons.Add("Complete artifact byte sizes are unavailable or inconsistent.");
        if (model.ContextLimit is null or <= 0) reasons.Add("Documented context limit is unavailable.");
        if (reasons.Count > 0)
            return new(artifact.Id, "unknown", artifact.SizeBytes > 0 ? artifact.SizeBytes/GiB : null,
                null, null, null, null, null, null, null, Version, "unverified", assumptions, reasons);
        if (a.SlidingWindow is > 0 || a.Type?.StartsWith("gemma") == true)
            assumptions.Add("Sliding/local attention uses a conservative full-context cache upper bound; runtime cache allocation can be smaller.");
        double weights = artifact.SizeBytes / GiB;
        int bytes = s.CachePrecision == "f32" ? 4 : 2;
        double cache = 2.0 * a.Layers!.Value * a.KvHeads!.Value * a.HeadDim!.Value * s.ContextTokens * bytes * s.Concurrency / GiB;
        double runtime = .75 + .05 * weights;
        double safety = .1 * (weights + cache + runtime);
        double total = weights + cache + runtime + safety;
        bool contextOk = s.ContextTokens <= model.ContextLimit;
        double baseGpu = cache + runtime + safety;
        double gpuWeights = Math.Clamp(s.GpuGiB - baseGpu, 0, weights);
        double offloaded = weights - gpuWeights;
        double system = offloaded + 2;
        string status;
        if (!contextOk) { status = "outside-budget"; reasons.Add($"Requested context exceeds the documented {model.ContextLimit:N0}-token model limit."); }
        else if (s.RamGiB < 2) { status = "outside-budget"; reasons.Add("Available system RAM is below the stated 2 GiB host reserve."); }
        else if (s.GpuGiB == 0) { status = "outside-budget"; reasons.Add("This estimator requires a dedicated GPU; zero VRAM is not a CPU-only estimate."); }
        else if (total <= s.GpuGiB) { status = "gpu-fit"; reasons.Add("Weights, estimated full cache, overhead and safety allowance fit the GPU budget."); }
        else if (s.AllowOffload && baseGpu <= s.GpuGiB && system <= s.RamGiB)
        { status = "offload"; reasons.Add($"Approximately {offloaded:F2} GiB of weights must move to system RAM. Runtime support and speed remain unverified."); }
        else
        {
            status = "outside-budget";
            if (!s.AllowOffload) reasons.Add("Full estimated residency exceeds the GPU budget and offloading is disabled.");
            else if (baseGpu > s.GpuGiB) reasons.Add("Cache, overhead and safety alone exceed the GPU budget; this weight-only offloading rule cannot fit.");
            else reasons.Add("Offloaded weights plus the host reserve exceed the separate RAM budget.");
        }
        return new(artifact.Id, status, weights, cache, runtime, safety, total,
            status == "offload" ? baseGpu + gpuWeights : total,
            status == "offload" ? system : 2, contextOk, Version, "unverified", assumptions, reasons);
    }
}
