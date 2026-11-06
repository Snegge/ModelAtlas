# Catalog expansion research — pending metadata access

Checked 2026-11-06T19:32:02.715044+00:00. Found **49 distinct published model references** in official project READMEs. These are discovery candidates, not verified catalog entries or an exhaustive current leaderboard. Precision-only FP8/GGUF/NVFP4 references and speech/vision-only products were excluded from this list. Base and instruction-tuned releases are distinct candidates.

The live catalog still contains **38 releases / 114 artifacts**. Target: at least **76 releases**, with broader publisher/architecture and size coverage. Do not count this research list toward the target.

## Blocking prerequisite

The configured HTTP proxy rejected `https://huggingface.co/api/models?...` with CONNECT 403. The environment draft now requests `huggingface.co`, `us.aws.cdn.hf.co` and `cas-bridge.xethub.hf.co`, as required by the existing importer. The running policy still does not include these domains. Review/save the network settings and publish through the environment UI before retrying. No API key was requested.

Official GitHub READMEs below were accessible and read directly. Their model references do not establish accessible GGUF files, byte sizes, revision hashes, licenses or runtime support. Those must be verified through the existing importer before adding records. Large MoE/hybrid candidates may remain unassessable in the current estimator; do not fabricate dense-transformer assumptions for them.

## Candidate sources

### OpenAI

Source: [OpenAI official README](https://raw.githubusercontent.com/openai/gpt-oss/main/README.md)

- `openai/gpt-oss-120b`
- `openai/gpt-oss-20b`

### SmolLM

Source: [SmolLM official README](https://raw.githubusercontent.com/huggingface/smollm/main/README.md)

- `HuggingFaceTB/SmolLM3-3B`
- `HuggingFaceTB/SmolLM3-3B-Base`

### OLMo

Source: [OLMo official README](https://raw.githubusercontent.com/allenai/OLMo/main/README.md)

- `allenai/OLMo-2-0325-32B`
- `allenai/OLMo-2-0325-32B-Instruct`
- `allenai/OLMo-2-0425-1B`
- `allenai/OLMo-2-0425-1B-Instruct`
- `allenai/OLMo-2-1124-13B`
- `allenai/OLMo-2-1124-13B-Instruct`
- `allenai/OLMo-2-1124-7B`
- `allenai/OLMo-2-1124-7B-Instruct`

### Granite

Source: [Granite official README](https://raw.githubusercontent.com/ibm-granite/granite-4.0-language-models/main/README.md)

- `ibm-granite/granite-4.0-micro`
- `ibm-granite/granite-4.0-h-micro-base`
- `ibm-granite/granite-4.0-h-micro`
- `ibm-granite/granite-4.0-h-tiny-base`
- `ibm-granite/granite-4.0-h-tiny`
- `ibm-granite/granite-4.0-h-small-base`
- `ibm-granite/granite-4.0-h-small`
- `ibm-granite/granite-4.0-8b-base`
- `ibm-granite/granite-4.0-8b`

### Qwen

Source: [Qwen official README](https://raw.githubusercontent.com/QwenLM/Qwen3/main/README.md)

- `Qwen/Qwen3-235B-A22B-Instruct-2507`
- `Qwen/Qwen3-235B-A22B-Thinking-2507`
- `Qwen/Qwen3-30B-A3B-Instruct-2507`
- `Qwen/Qwen3-30B-A3B-Thinking-2507`
- `Qwen/Qwen3-4B-Instruct-2507`
- `Qwen/Qwen3-4B-Thinking-2507`

### Qwen Coder

Source: [Qwen Coder official README](https://raw.githubusercontent.com/QwenLM/Qwen3-Coder/main/README.md)

- `Qwen/Qwen3-Coder-30B-A3B-Instruct`
- `Qwen/Qwen3-Coder-480B-A35B-Instruct`
- `Qwen/Qwen3-Coder-Next`
- `Qwen/Qwen3-Coder-Next-Base`

### Qwen Next

Source: [Qwen Next official README](https://raw.githubusercontent.com/QwenLM/Qwen3-Next/main/README.md)

- `Qwen/Qwen3.8-2.4T-A95B`
- `Qwen/Qwen3.8-27B`

### GLM

Source: [GLM official README](https://raw.githubusercontent.com/zai-org/GLM-4.5/main/README.md)

- `zai-org/GLM-4.5`
- `zai-org/GLM-4.5-Air`
- `zai-org/GLM-4.5-Air-Base`
- `zai-org/GLM-4.5-Base`
- `zai-org/GLM-4.6`
- `zai-org/GLM-4.7`
- `zai-org/GLM-4.7-Flash`

### Phi

Source: [Phi official README](https://raw.githubusercontent.com/microsoft/PhiCookBook/main/README.md)

- `microsoft/Phi-4-mini-reasoning`

### Nemotron

Source: [Nemotron official README](https://raw.githubusercontent.com/NVIDIA-NeMo/Nemotron/main/README.md)

- `nvidia/Llama-3.1-Nemotron-Nano-8B-v1`
- `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-BF16`
- `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-Base-BF16`
- `nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-BF16`
- `nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B-BF16`
- `nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-BF16`
- `nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-Base-BF16`
- `nvidia/Nemotron-3-Super-49B-v1`

## Resume the import

1. Verify that the running network policy includes the required hosts and retry the public Hub API.
2. Discover concrete GGUF repositories with a verified base-model mapping; prioritize new families and smaller practical models, not only additional Qwen sizes.
3. Preserve all existing releases and their provenance. Verify full shard sets, byte counts, SHA256 metadata and bounded GGUF headers using `scripts/import_catalog.py`.
4. Add only successfully verified sources; maintain explicit unknown values for unsupported architectures or missing metadata. Keep synthetic quality/popularity clearly separate.
5. Confirm at least 76 unique release IDs, update count/date documentation and snapshot-dependent tests, rebuild/restart the API to load the expanded snapshot, and run tests and browser validation.
