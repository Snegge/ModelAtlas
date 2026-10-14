# Data sources and provenance

## Source contracts

The populated snapshot in `data/catalog.json` is real metadata from public Hugging Face repositories, retrieved by the included importer. It is bundled so the application has no live external API dependency. `data/sources.json` is a curated candidate list, not a list of invented model records.

- [Hugging Face documented Hub API](https://huggingface.co/docs/hub/api): `/api/models/{owner}/{repo}?blobs=true` provides revision SHA, structured card data, siblings/file sizes and available LFS SHA256s. Original-model API `safetensors.total` or its typed parameter totals supplies total parameter counts.
- Original revision-pinned `config.json` supplies architecture, layer/head dimensions, KV head count and `max_position_embeddings`. No larger context is extrapolated from RoPE scaling or a model name.
- If original configuration access is gated with HTTP 401, the importer uses revision-pinned artifact GGUF metadata. Context/architecture source is labelled `artifact-gguf-header` in the snapshot, detail panel and CSV; other releases use `model-config`. The artifact publisher’s declared context is not an independent confirmation of original runtime support.
- [GGUF format specification](https://github.com/ggml-org/ggml/blob/master/docs/gguf.md): the importer validates binary magic/version and `general.file_type`, mapping documented GGUF type values to quantization labels. Filename matching selects candidates only; it does not establish quantization.
- GGUF sources are curated public `bartowski` conversions. Model publisher/family is separated from artifact publisher/repository. Conversion provenance is provided through structured `base_model` mappings. An absent or ambiguous mapping is rejected.

## Snapshot identities and completeness

A **release** is the exact original Hugging Face release identifier, including model size and any instruction-tuned suffix. A stable ID is derived from that identifier. A **downloadable artifact** is one quantization/file-set group at an exact converter repository revision. Its ID includes repository, revision and filename group; every file has path, size, advertised LFS SHA256 and an immutable resolve URL.

GGUF split filenames are grouped, sequential numbering and expected shard counts are checked, all file sizes/checksums must be present, and split headers are checked. The primary header must expose actual quantization; later shard headers may legitimately contain split metadata without repeating `general.file_type`. Their indexes/counts and any quantization fields present must agree. Missing metadata is not guessed.

Each request reads at most 512 KiB initially or 8 MiB on an explicit retry. A server that ignores the Range header is rejected before weights are read. The importer stores only small normalized metadata; downloaded weight files are never saved. LFS checksums are **advertised source checksums**, not checksums recalculated over complete model files. `verified-metadata` describes metadata validation, not a full weight-integrity audit.

A refresh writes a temporary snapshot and atomically replaces the output only after adequate coverage succeeds. It rejects access/rate-limit failures or loss of existing release coverage, preserving the last valid snapshot. Curated unavailable candidates remain visible as import issues. The importer is reproducible but upstream repository revisions and public access can change; exact retrieved SHAs are preserved in the snapshot.

## Missing fields and estimation boundaries

- Active parameter totals are unknown for the included MoE release. Expert counts are stored when present, but are not converted into invented active-parameter totals. Stored weights always use full artifact bytes.
- `instructionTuned` is true only for explicit instruct/chat/IT release identifiers; otherwise it remains unknown. Absence of such a suffix is not treated as evidence of a base model. Model identities and original cards remain available.
- Missing license, tuning status or active totals is recorded in release `missingFields`/validation status. Missing estimator-critical architecture or context fields yields Unknown. Missing noncritical descriptive fields does not imply memory incompatibility.
- Supported estimates use conventional transformer KV metadata. The Qwen3 MoE release is retained but returns **Insufficient information** because MoE placement is outside this estimator.
- Sliding/local attention uses a conservative full-context cache upper bound. Architecture support by llama.cpp or another runtime is **unverified**, separately from the memory classification.
- Quantization memory differences use actual file-set bytes. No benchmark score, download count, likes-based capability score, tokens-per-second rate or unverified runtime command is included.
- License identifiers come from original structured card metadata. Source links allow inspection of actual license terms; catalog inclusion does not grant a license to model weights.

## Refresh

```sh
python3 scripts/import_catalog.py --workers 4
```

On Windows PowerShell use `py -3 .\scripts\import_catalog.py --workers 4`. Requires public HTTPS access to `huggingface.co` and observed redirect host `us.aws.cdn.hf.co`; some deployments use `cas-bridge.xethub.hf.co`. No credentials are required for the selected artifact sources. Gated/unavailable sources are reported rather than bypassed. Restart the API after refresh.

## Actual bundled coverage

Snapshot retrieval: `2026-10-11T10:05:04.444995+00:00`. Importer: `hf-gguf/1.0.0`.

**38 distinct releases, 114 complete artifacts, 6 families.** Each release has Q4_K_M, Q5_K_M and Q8_0 artifacts. 6 artifacts are multi-file sets. 14 releases have descriptive missing fields.

| Family | Releases | Artifacts |
|---|---:|---:|
| DeepSeek | 6 | 18 |
| Gemma | 3 | 9 |
| Llama | 4 | 12 |
| Mistral | 3 | 9 |
| Phi | 2 | 6 |
| Qwen | 20 | 60 |

### Included model releases

| Exact release identifier | Architecture | Context tokens | Context source |
|---|---|---:|---|
| [deepseek-ai/DeepSeek-R1-Distill-Llama-70B](https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Llama-70B/blob/b1c0b44b4369b597ad119a196caf79a9c40e141e/README.md) | llama | 131072 | model-config |
| [deepseek-ai/DeepSeek-R1-Distill-Llama-8B](https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Llama-8B/blob/6a6f4aa4197940add57724a7707d069478df56b1/README.md) | llama | 131072 | model-config |
| [deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B](https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B/blob/ad9f0ae0864d7fbcd1cd905e3c6c5b069cc8b562/README.md) | qwen2 | 131072 | model-config |
| [deepseek-ai/DeepSeek-R1-Distill-Qwen-14B](https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Qwen-14B/blob/1df8507178afcc1bef68cd8c393f61a886323761/README.md) | qwen2 | 131072 | model-config |
| [deepseek-ai/DeepSeek-R1-Distill-Qwen-32B](https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Qwen-32B/blob/711ad2ea6aa40cfca18895e8aca02ab92df1a746/README.md) | qwen2 | 131072 | model-config |
| [deepseek-ai/DeepSeek-R1-Distill-Qwen-7B](https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Qwen-7B/blob/916b56a44061fd5cd7d6a8fb632557ed4f724f60/README.md) | qwen2 | 131072 | model-config |
| [google/gemma-2-27b-it](https://huggingface.co/google/gemma-2-27b-it/blob/aaf20e6b9f4c0fcf043f6fb2a2068419086d77b0/README.md) | gemma2 | 8192 | artifact-gguf-header |
| [google/gemma-2-2b-it](https://huggingface.co/google/gemma-2-2b-it/blob/299a8560bedf22ed1c72a8a11e7dce4a7f9f51f8/README.md) | gemma2 | 8192 | artifact-gguf-header |
| [google/gemma-2-9b-it](https://huggingface.co/google/gemma-2-9b-it/blob/11c9b309abf73637e4b6f9a3fa1e92e615547819/README.md) | gemma2 | 8192 | artifact-gguf-header |
| [meta-llama/Llama-3.2-1B-Instruct](https://huggingface.co/meta-llama/Llama-3.2-1B-Instruct/blob/9213176726f574b556790deb65791e0c5aa438b6/README.md) | llama | 131072 | artifact-gguf-header |
| [meta-llama/Llama-3.2-3B-Instruct](https://huggingface.co/meta-llama/Llama-3.2-3B-Instruct/blob/0cb88a4f764b7a12671c53f0838cd831a0843b95/README.md) | llama | 131072 | artifact-gguf-header |
| [meta-llama/Meta-Llama-3.1-70B-Instruct](https://huggingface.co/meta-llama/Meta-Llama-3.1-70B-Instruct/blob/1605565b47bb9346c5515c34102e054115b4f98b/README.md) | llama | 131072 | artifact-gguf-header |
| [meta-llama/Meta-Llama-3.1-8B-Instruct](https://huggingface.co/meta-llama/Meta-Llama-3.1-8B-Instruct/blob/0e9e39f249a16976918f6564b8830bc894c89659/README.md) | llama | 131072 | artifact-gguf-header |
| [mistralai/Ministral-8B-Instruct-2410](https://huggingface.co/mistralai/Ministral-8B-Instruct-2410/blob/2f494a194c5b980dfb9772cb92d26cbb671fce5a/README.md) | mistral | 32768 | model-config |
| [mistralai/Mistral-Nemo-Instruct-2407](https://huggingface.co/mistralai/Mistral-Nemo-Instruct-2407/blob/04d8a90549d23fc6bd7f642064003592df51e9b3/README.md) | mistral | 131072 | model-config |
| [mistralai/Mistral-Small-24B-Instruct-2501](https://huggingface.co/mistralai/Mistral-Small-24B-Instruct-2501/blob/9527884be6e5616bdd54de542f9ae13384489724/README.md) | mistral | 32768 | model-config |
| [microsoft/Phi-3.5-mini-instruct](https://huggingface.co/microsoft/Phi-3.5-mini-instruct/blob/2fe192450127e6a83f7441aef6e3ca586c338b77/README.md) | phi3 | 131072 | model-config |
| [microsoft/phi-4](https://huggingface.co/microsoft/phi-4/blob/2db69c1c3e91a05d2c64a3185acfbaf36f744e25/README.md) | phi3 | 16384 | model-config |
| [Qwen/Qwen2.5-0.5B-Instruct](https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct/blob/7ae557604adf67be50417f59c2c2f167def9a775/README.md) | qwen2 | 32768 | model-config |
| [Qwen/Qwen2.5-1.5B-Instruct](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct/blob/989aa7980e4cf806f80c7fef2b1adb7bc71aa306/README.md) | qwen2 | 32768 | model-config |
| [Qwen/Qwen2.5-14B-Instruct](https://huggingface.co/Qwen/Qwen2.5-14B-Instruct/blob/cf98f3b3bbb457ad9e2bb7baf9a0125b6b88caa8/README.md) | qwen2 | 32768 | model-config |
| [Qwen/Qwen2.5-32B-Instruct](https://huggingface.co/Qwen/Qwen2.5-32B-Instruct/blob/5ede1c97bbab6ce5cda5812749b4c0bdf79b18dd/README.md) | qwen2 | 32768 | model-config |
| [Qwen/Qwen2.5-3B-Instruct](https://huggingface.co/Qwen/Qwen2.5-3B-Instruct/blob/aa8e72537993ba99e69dfaafa59ed015b17504d1/README.md) | qwen2 | 32768 | model-config |
| [Qwen/Qwen2.5-72B-Instruct](https://huggingface.co/Qwen/Qwen2.5-72B-Instruct/blob/495f39366efef23836d0cfae4fbe635880d2be31/README.md) | qwen2 | 32768 | model-config |
| [Qwen/Qwen2.5-7B-Instruct](https://huggingface.co/Qwen/Qwen2.5-7B-Instruct/blob/a09a35458c702b33eeacc393d103063234e8bc28/README.md) | qwen2 | 32768 | model-config |
| [Qwen/Qwen2.5-Coder-0.5B-Instruct](https://huggingface.co/Qwen/Qwen2.5-Coder-0.5B-Instruct/blob/ea3f2471cf1b1f0db85067f1ef93848e38e88c25/README.md) | qwen2 | 32768 | model-config |
| [Qwen/Qwen2.5-Coder-1.5B-Instruct](https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct/blob/2e1fd397ee46e1388853d2af2c993145b0f1098a/README.md) | qwen2 | 32768 | model-config |
| [Qwen/Qwen2.5-Coder-14B-Instruct](https://huggingface.co/Qwen/Qwen2.5-Coder-14B-Instruct/blob/aedcc2d42b622764e023cf882b6652e646b95671/README.md) | qwen2 | 32768 | model-config |
| [Qwen/Qwen2.5-Coder-32B-Instruct](https://huggingface.co/Qwen/Qwen2.5-Coder-32B-Instruct/blob/381fc969f78efac66bc87ff7ddeadb7e73c218a7/README.md) | qwen2 | 32768 | model-config |
| [Qwen/Qwen2.5-Coder-3B-Instruct](https://huggingface.co/Qwen/Qwen2.5-Coder-3B-Instruct/blob/488639f1ff808d1d3d0ba301aef8c11461451ec5/README.md) | qwen2 | 32768 | model-config |
| [Qwen/Qwen2.5-Coder-7B-Instruct](https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct/blob/c03e6d358207e414f1eca0bb1891e29f1db0e242/README.md) | qwen2 | 32768 | model-config |
| [Qwen/Qwen3-0.6B](https://huggingface.co/Qwen/Qwen3-0.6B/blob/c1899de289a04d12100db370d81485cdf75e47ca/README.md) | qwen3 | 40960 | model-config |
| [Qwen/Qwen3-1.7B](https://huggingface.co/Qwen/Qwen3-1.7B/blob/70d244cc86ccca08cf5af4e1e306ecf908b1ad5e/README.md) | qwen3 | 40960 | model-config |
| [Qwen/Qwen3-14B](https://huggingface.co/Qwen/Qwen3-14B/blob/40c069824f4251a91eefaf281ebe4c544efd3e18/README.md) | qwen3 | 40960 | model-config |
| [Qwen/Qwen3-30B-A3B](https://huggingface.co/Qwen/Qwen3-30B-A3B/blob/ad44e777bcd18fa416d9da3bd8f70d33ebb85d39/README.md) | qwen3_moe | 40960 | model-config |
| [Qwen/Qwen3-32B](https://huggingface.co/Qwen/Qwen3-32B/blob/9216db5781bf21249d130ec9da846c4624c16137/README.md) | qwen3 | 40960 | model-config |
| [Qwen/Qwen3-4B](https://huggingface.co/Qwen/Qwen3-4B/blob/1cfa9a7208912126459214e8b04321603b3df60c/README.md) | qwen3 | 40960 | model-config |
| [Qwen/Qwen3-8B](https://huggingface.co/Qwen/Qwen3-8B/blob/b968826d9c46dd6066d109eabc6255188de91218/README.md) | qwen3 | 40960 | model-config |

### Unavailable curated candidates

- `bartowski/Meta-Llama-3-8B-Instruct-GGUF`: Missing verified base_model mapping.
- `bartowski/Mistral-7B-Instruct-v0.3-GGUF`: Missing verified base_model mapping.
- `bartowski/Meta-Llama-3-70B-Instruct-GGUF`: Missing verified base_model mapping.
- `bartowski/Phi-3-mini-4k-instruct-GGUF`: Missing verified base_model mapping.
- `bartowski/Phi-3-mini-128k-instruct-GGUF`: HTTP Error 401: Unauthorized.
