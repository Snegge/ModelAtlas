namespace ModelAtlas.Api;

/// <summary>Single NVIDIA GPU, llama.cpp CUDA, one sequence; full GPU residency.</summary>
public sealed class Estimator
{
    public const string Version = "cuda-full-gpu/3.0.0";
    public const string Suite = "hf-leaderboard-ifeval2-mmlupro0.1/v1";
    public const string ConditionsHash = "92ce71d01c6101ccbe76ef7f6edcfb6eb0c4c4991f6ea2d96db9be8d0ed8d70c";
    const double GiB = 1073741824;
    public static readonly HashSet<string> Supported = ["llama", "mistral", "qwen2", "qwen3", "gemma", "gemma2", "phi3", "phi", "smollm3", "granite", "olmo2", "olmo3", "ministral3", "apertus", "exaone", "exaone4", "gemma3"];
    public static List<string> Validate(HardwareSettings s)
    {
        List<string> errors = [];
        if (s.RamGiB is double ram && (!double.IsFinite(ram) || ram < 0 || ram > 2048)) errors.Add("System RAM must be 0–2048 GiB.");
        if (!double.IsFinite(s.GpuGiB) || s.GpuGiB < 0 || s.GpuGiB > 192) errors.Add("GPU memory must be 0–192 GiB.");
        if (s.BandwidthGBps is double bw && (!double.IsFinite(bw) || bw <= 0 || bw > 10000)) errors.Add("NVIDIA GPU bandwidth must be greater than 0 and at most 10,000 GB/s.");
        if (!double.IsFinite(s.MinimumTokensPerSecond) || s.MinimumTokensPerSecond < 0 || s.MinimumTokensPerSecond > 1000) errors.Add("Minimum generation speed must be 0–1,000 tokens/s.");
        if (s.ContextTokens < 256 || s.ContextTokens > 1048576) errors.Add("Context must be 256–1,048,576 tokens.");
        if (s.CachePrecision != "f16") errors.Add("Only F16 KV cache is supported.");
        if (s.Concurrency != 1) errors.Add("Exactly one simultaneous request is supported.");
        if (s.Quantization is not ("Q4_K_M" or "Q5_K_M" or "Q8_0" or "smallest")) errors.Add("Unknown quantization preference.");
        return errors;
    }
    public Estimate Evaluate(ModelRelease model, ModelArtifact artifact, HardwareSettings s)
    {
        var a = model.Architecture;
        List<string> assumptions = [
            "One NVIDIA GPU, llama.cpp CUDA, full GPU placement, one simultaneous request, F16 KV cache.",
            "Complete GGUF file bytes approximate resident weights.",
            "Selected context is fully occupied for both KV allocation and per-token attention traffic; prompt processing is excluded.",
            "Runtime allowance = 0.75 GiB + 5% of weights; safety = 10% of weights + KV cache + runtime.",
            "Typical generation speed uses 70% of the context-aware bandwidth roofline and a quantization throughput factor. The 50–85% sensitivity range is heuristic, not a confidence interval.",
            "Score: quality 45 points, fit 25, speed 15, VRAM utilization 15. Quality inputs can be measured reference indices or attributed editorial ratings, not interchangeable benchmark measurements."
        ];
        List<string> reasons = Validate(s);
        if (!Supported.Contains(a.Type ?? "") || a.Experts > 1) reasons.Add("Architecture is outside the supported dense transformer subset.");
        if (a.Layers is null or <= 0 || a.HiddenSize is null or <= 0 || a.AttentionHeads is null or <= 0 || a.KvHeads is null or <= 0 || a.HeadDim is null or <= 0)
            reasons.Add("Missing architecture parameters.");
        if (artifact.SizeBytes <= 0 || artifact.Files.Count == 0 || artifact.Files.Sum(f => f.SizeBytes) != artifact.SizeBytes) reasons.Add("Incomplete GGUF file set.");
        if (model.ContextLimit is null or <= 0) reasons.Add("Missing documented context limit.");
        if (reasons.Count > 0) return new(artifact.Id,"unknown",null,null,null,null,null,null,null,Version,"unsupported",assumptions,reasons);
        if (a.SlidingWindow is > 0 || a.Type?.StartsWith("gemma") == true)
            assumptions.Add("Local/sliding attention is conservatively treated as full-context attention; actual cache and attention traffic can be lower.");
        double weights = artifact.SizeBytes / GiB;
        double cache = 4.0 * a.Layers!.Value * a.KvHeads!.Value * a.HeadDim!.Value * s.ContextTokens / GiB;
        double runtime = .75 + .05 * weights, safety = .1 * (weights + cache + runtime);
        double total = weights + cache + runtime + safety;
        bool contextOk = s.ContextTokens <= model.ContextLimit;
        string status = contextOk && total <= s.GpuGiB ? "gpu-fit" : "outside-budget";
        if (!contextOk) reasons.Add($"Selected context exceeds the documented {model.ContextLimit / 1024.0:0.##}K-token limit.");
        if (total > s.GpuGiB) reasons.Add($"Full GPU placement requires approximately {total:F1} GiB, exceeding the {s.GpuGiB:F1} GiB budget.");
        SpeedEstimate? speed = null;
        bool eligible = false;
        if (status == "gpu-fit" && s.BandwidthGBps is > 0)
        {
            double roof = s.BandwidthGBps.Value * 1e9 / (artifact.SizeBytes + cache * GiB);
            double quant = artifact.Quantization switch { "Q4_K_M" => 1.08, "Q5_K_M" => 1.01, "Q8_0" => .90, _ => 1 };
            double low = Math.Floor(roof * .50 * quant), high = Math.Ceiling(roof * .85 * quant);
            speed = new(low, high, "bandwidth-context/2; heuristic; WIR-inspired efficiency, with selected-context KV traffic", roof * .70 * quant);
            eligible = low >= s.MinimumTokensPerSecond;
            if (!eligible) reasons.Add($"Conservative generation estimate ({low:0} tokens/s) is below the requested {s.MinimumTokensPerSecond:0.#} tokens/s.");
        }
        else if (status == "gpu-fit") reasons.Add("Enter NVIDIA GPU memory bandwidth to check minimum speed.");
        if (eligible) reasons.Add("Full GPU placement and conservative minimum-speed checks passed.");
        ScoreBreakdown? parts = null;
        double? quality = model.QualityRating?.Score ?? model.ReferenceQuality?.Score;
        if (eligible && speed is not null && quality is not null) {
            double utilization = total / s.GpuGiB;
            parts = new(.45 * quality.Value, utilization <= .82 ? 25 : 22,
                Math.Min(15, Math.Log2(speed.Typical + 1) * 2.3), Math.Min(15, utilization / .70 * 15));
        }
        double? score = status == "outside-budget" || (speed is not null && !eligible) ? 0 :
            parts is null ? null : Math.Clamp(parts.Quality + parts.Fit + parts.Speed + parts.Utilization, 0, 100);
        string? ramAdvice = s.RamGiB is double available && available < weights + 4
            ? $"RAM planning hint: allow roughly {Math.Ceiling(weights + 4):0} GiB for a full host weight copy plus 4 GiB for the OS. llama.cpp mmap may need less; RAM never extends VRAM or enables offloading." : null;
        return new(artifact.Id,status,weights,cache,runtime,safety,total,total,contextOk,Version,"llama.cpp CUDA; modeled, not locally benchmarked",assumptions,reasons,speed,eligible,score,parts,ramAdvice);
    }
}
