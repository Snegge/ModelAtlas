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

- Active parameter totals are unknown for MoE releases. Expert counts are stored when present, but are not converted into invented active-parameter totals. Stored weights always use full artifact bytes.
- `instructionTuned` is true only for explicit instruct/chat/IT release identifiers; otherwise it remains unknown. Absence of such a suffix is not treated as evidence of a base model. Model identities and original cards remain available.
- Missing license, tuning status or active totals is recorded in release `missingFields`/validation status. Missing estimator-critical architecture or context fields yields Unknown. Missing noncritical descriptive fields does not imply memory incompatibility.
- Supported estimates use conventional transformer KV metadata. MoE and unsupported architectures (including hybrid/state-space variants) remain visible but return **Insufficient information**. New families do not automatically expand estimator support.
- Sliding/local attention uses a conservative full-context cache upper bound. Architecture support by llama.cpp or another runtime is **unverified**, separately from the memory classification.
- Quantization memory differences use actual file-set bytes. No benchmark score, download count, likes-based capability score, tokens-per-second rate or unverified runtime command is included.
- License identifiers come from original structured card metadata. Source links allow inspection of actual license terms; catalog inclusion does not grant a license to model weights.

## Refresh

```sh
python3 scripts/import_catalog.py --workers 4
```

On Windows PowerShell use `py -3 .\scripts\import_catalog.py --workers 4`. Requires public HTTPS access to `huggingface.co` and observed redirect host `us.aws.cdn.hf.co`; some deployments use `cas-bridge.xethub.hf.co`. No credentials are required for the selected artifact sources. Gated/unavailable sources are reported rather than bypassed. Restart the API after refresh.

To add sources while retaining the existing pinned records, edit `data/sources.json` and run:

```sh
python3 scripts/import_catalog.py --extend --minimum-releases 76 --workers 4
```

Extension skips already imported artifact repositories and preserves existing release IDs, artifact IDs, source revisions and individual retrieval dates. Duplicate base releases are resolved in deterministic source order. The minimum applies to unique releases, not quantizations. A failed target or access/rate-limit failure leaves the snapshot unchanged. The default command above still performs a complete refresh. The snapshot timestamp records assembly; it does not imply all older records were fetched again.

## Actual bundled coverage

Snapshot assembled: `2026-11-06T19:50:39.698627+00:00`. Importer: `hf-gguf/1.1.0`. Original 38 releases and 114 artifacts remain byte-for-byte equivalent as records, with their October 11 retrieval dates; 46 releases and 138 artifacts were retrieved on November 6, 2026.

**84 distinct releases, 252 complete artifacts, 14 families.** Each release has Q4_K_M, Q5_K_M and Q8_0 artifacts. 8 artifacts are multi-file sets. 39 releases have at least one missing descriptive or architecture field. These are real source metadata, not demo model entries. Quality and popularity remain separate, clearly labelled synthetic UI fixtures.

| Family | Releases | Artifacts |
|---|---:|---:|
| Apertus | 1 | 3 |
| DeepSeek | 6 | 18 |
| EXAONE | 4 | 12 |
| Falcon | 4 | 12 |
| Gemma | 4 | 12 |
| Granite | 6 | 18 |
| LFM | 4 | 12 |
| Llama | 4 | 12 |
| Mistral | 11 | 33 |
| Nemotron | 3 | 9 |
| OLMo | 6 | 18 |
| Phi | 6 | 18 |
| Qwen | 21 | 63 |
| SmolLM | 4 | 12 |

### Included model releases

| Exact release identifier | Architecture | Context tokens | Context source |
|---|---|---:|---|
| [swiss-ai/Apertus-8B-Instruct-2509](https://huggingface.co/swiss-ai/Apertus-8B-Instruct-2509/blob/b946d40447b2b597999b9c86d44bee0b452c919f/README.md) | apertus | 65536 | model-config |
| [deepseek-ai/DeepSeek-R1-Distill-Llama-70B](https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Llama-70B/blob/b1c0b44b4369b597ad119a196caf79a9c40e141e/README.md) | llama | 131072 | model-config |
| [deepseek-ai/DeepSeek-R1-Distill-Llama-8B](https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Llama-8B/blob/6a6f4aa4197940add57724a7707d069478df56b1/README.md) | llama | 131072 | model-config |
| [deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B](https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B/blob/ad9f0ae0864d7fbcd1cd905e3c6c5b069cc8b562/README.md) | qwen2 | 131072 | model-config |
| [deepseek-ai/DeepSeek-R1-Distill-Qwen-14B](https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Qwen-14B/blob/1df8507178afcc1bef68cd8c393f61a886323761/README.md) | qwen2 | 131072 | model-config |
| [deepseek-ai/DeepSeek-R1-Distill-Qwen-32B](https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Qwen-32B/blob/711ad2ea6aa40cfca18895e8aca02ab92df1a746/README.md) | qwen2 | 131072 | model-config |
| [deepseek-ai/DeepSeek-R1-Distill-Qwen-7B](https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Qwen-7B/blob/916b56a44061fd5cd7d6a8fb632557ed4f724f60/README.md) | qwen2 | 131072 | model-config |
| [LGAI-EXAONE/EXAONE-4.0-1.2B](https://huggingface.co/LGAI-EXAONE/EXAONE-4.0-1.2B/blob/3abf2810673c7c0778df64a73c2d52eab32d91c4/README.md) | exaone4 | 65536 | model-config |
| [LGAI-EXAONE/EXAONE-4.0.1-32B](https://huggingface.co/LGAI-EXAONE/EXAONE-4.0.1-32B/blob/a6b0bd4b0fb47cd3c644d60d12dba8ecdb9dc810/README.md) | exaone4 | 131072 | model-config |
| [LGAI-EXAONE/EXAONE-Deep-2.4B](https://huggingface.co/LGAI-EXAONE/EXAONE-Deep-2.4B/blob/69d80cdf4784e2c182854d83e9b2d02494626a3e/README.md) | exaone | 32768 | model-config |
| [LGAI-EXAONE/EXAONE-Deep-7.8B](https://huggingface.co/LGAI-EXAONE/EXAONE-Deep-7.8B/blob/8a120673fc7309b55be2175a2e61f9a0839e4f61/README.md) | exaone | 32768 | model-config |
| [tiiuae/Falcon3-10B-Instruct](https://huggingface.co/tiiuae/Falcon3-10B-Instruct/blob/8799bc6aec0152757221dc6b272d824642db6202/README.md) | llama | 32768 | model-config |
| [tiiuae/Falcon3-1B-Instruct](https://huggingface.co/tiiuae/Falcon3-1B-Instruct/blob/28ba2251970a01dd1edc7ba7dad2eb71216ccfdf/README.md) | llama | 8192 | model-config |
| [tiiuae/Falcon3-3B-Instruct](https://huggingface.co/tiiuae/Falcon3-3B-Instruct/blob/411bb94318f94f7a5735b77109f456b1e74b42a1/README.md) | llama | 32768 | model-config |
| [tiiuae/Falcon3-7B-Instruct](https://huggingface.co/tiiuae/Falcon3-7B-Instruct/blob/1e57a0ecd176c7c139f289c60a74e57f887c3dfb/README.md) | llama | 32768 | model-config |
| [google/gemma-2-27b-it](https://huggingface.co/google/gemma-2-27b-it/blob/aaf20e6b9f4c0fcf043f6fb2a2068419086d77b0/README.md) | gemma2 | 8192 | artifact-gguf-header |
| [google/gemma-2-2b-it](https://huggingface.co/google/gemma-2-2b-it/blob/299a8560bedf22ed1c72a8a11e7dce4a7f9f51f8/README.md) | gemma2 | 8192 | artifact-gguf-header |
| [google/gemma-2-9b-it](https://huggingface.co/google/gemma-2-9b-it/blob/11c9b309abf73637e4b6f9a3fa1e92e615547819/README.md) | gemma2 | 8192 | artifact-gguf-header |
| [google/gemma-3-270m-it](https://huggingface.co/google/gemma-3-270m-it/blob/ac82b4e820549b854eebf28ce6dedaf9fdfa17b3/README.md) | gemma3 | 32768 | artifact-gguf-header |
| [ibm-granite/granite-3.3-2b-instruct](https://huggingface.co/ibm-granite/granite-3.3-2b-instruct/blob/707f574c62054322f6b5b04b6d075f0a8f05e0f0/README.md) | granite | 131072 | model-config |
| [ibm-granite/granite-3.3-8b-instruct](https://huggingface.co/ibm-granite/granite-3.3-8b-instruct/blob/51dd4bc2ade4059a6bd87649d68aa11e4fb2529b/README.md) | granite | 131072 | model-config |
| [ibm-granite/granite-4.0-micro](https://huggingface.co/ibm-granite/granite-4.0-micro/blob/56111ae135df9c53a78c99028e7bc24035a9e979/README.md) | granitemoehybrid | 131072 | model-config |
| [ibm-granite/granite-4.2-30b](https://huggingface.co/ibm-granite/granite-4.2-30b/blob/9e668ce1c538387ef24d3644e9b0606647762636/README.md) | granite | 131072 | model-config |
| [ibm-granite/granite-4.2-3b](https://huggingface.co/ibm-granite/granite-4.2-3b/blob/4e9c275e232f10211ec88644d106a1f6a1b60e06/README.md) | granite | 131072 | model-config |
| [ibm-granite/granite-4.2-8b](https://huggingface.co/ibm-granite/granite-4.2-8b/blob/a7042144125ce5ae64f89610e8289647fc000b9a/README.md) | granite | 131072 | model-config |
| [LiquidAI/LFM2-1.2B-Extract](https://huggingface.co/LiquidAI/LFM2-1.2B-Extract/blob/e68bdd9af162cfca7d806b456a7a56406e6194fa/README.md) | lfm2 | 128000 | model-config |
| [LiquidAI/LFM2-2.6B-Exp](https://huggingface.co/LiquidAI/LFM2-2.6B-Exp/blob/2251c865342649ffb4a9f57d07ab2428bb552cf5/README.md) | lfm2 | 128000 | model-config |
| [LiquidAI/LFM2.5-1.2B-Instruct](https://huggingface.co/LiquidAI/LFM2.5-1.2B-Instruct/blob/b9d816ab510f9a28dca37cb182e9da8b0226e13c/README.md) | lfm2 | 128000 | model-config |
| [LiquidAI/LFM2.5-2.6B](https://huggingface.co/LiquidAI/LFM2.5-2.6B/blob/7141b56cd4650af95c7c7b86983443aed050c96a/README.md) | lfm2 | 131072 | model-config |
| [meta-llama/Llama-3.2-1B-Instruct](https://huggingface.co/meta-llama/Llama-3.2-1B-Instruct/blob/9213176726f574b556790deb65791e0c5aa438b6/README.md) | llama | 131072 | artifact-gguf-header |
| [meta-llama/Llama-3.2-3B-Instruct](https://huggingface.co/meta-llama/Llama-3.2-3B-Instruct/blob/0cb88a4f764b7a12671c53f0838cd831a0843b95/README.md) | llama | 131072 | artifact-gguf-header |
| [meta-llama/Meta-Llama-3.1-70B-Instruct](https://huggingface.co/meta-llama/Meta-Llama-3.1-70B-Instruct/blob/1605565b47bb9346c5515c34102e054115b4f98b/README.md) | llama | 131072 | artifact-gguf-header |
| [meta-llama/Meta-Llama-3.1-8B-Instruct](https://huggingface.co/meta-llama/Meta-Llama-3.1-8B-Instruct/blob/0e9e39f249a16976918f6564b8830bc894c89659/README.md) | llama | 131072 | artifact-gguf-header |
| [mistralai/Magistral-Small-2509](https://huggingface.co/mistralai/Magistral-Small-2509/blob/a31cc96ab10cf19bc42c628fedf1e359e0853c49/README.md) | mistral | 131072 | model-config |
| [mistralai/Ministral-3-14B-Instruct-2512-BF16](https://huggingface.co/mistralai/Ministral-3-14B-Instruct-2512-BF16/blob/3cea74c1ebaf5ce5f5a2553de470e2ceab825142/README.md) | ministral3 | 262144 | model-config |
| [mistralai/Ministral-3-14B-Reasoning-2512](https://huggingface.co/mistralai/Ministral-3-14B-Reasoning-2512/blob/51f9210f3cd20f3452a80d5819d15dc61cc50630/README.md) | ministral3 | 262144 | model-config |
| [mistralai/Ministral-3-3B-Instruct-2512-BF16](https://huggingface.co/mistralai/Ministral-3-3B-Instruct-2512-BF16/blob/b6d637bef2393152b3da2b2fde72eecdee30557e/README.md) | ministral3 | 262144 | model-config |
| [mistralai/Ministral-3-3B-Reasoning-2512](https://huggingface.co/mistralai/Ministral-3-3B-Reasoning-2512/blob/4a36357c811bf511a7b625d132e12f22408aac91/README.md) | ministral3 | 262144 | model-config |
| [mistralai/Ministral-3-8B-Instruct-2512-BF16](https://huggingface.co/mistralai/Ministral-3-8B-Instruct-2512-BF16/blob/f6fae9795746f63c9be8344932f01275f3c63734/README.md) | ministral3 | 262144 | model-config |
| [mistralai/Ministral-3-8B-Reasoning-2512](https://huggingface.co/mistralai/Ministral-3-8B-Reasoning-2512/blob/81eaece1948f3875421d9a45bc55487d10e2d894/README.md) | ministral3 | 262144 | model-config |
| [mistralai/Ministral-8B-Instruct-2410](https://huggingface.co/mistralai/Ministral-8B-Instruct-2410/blob/2f494a194c5b980dfb9772cb92d26cbb671fce5a/README.md) | mistral | 32768 | model-config |
| [mistralai/Mistral-Nemo-Instruct-2407](https://huggingface.co/mistralai/Mistral-Nemo-Instruct-2407/blob/04d8a90549d23fc6bd7f642064003592df51e9b3/README.md) | mistral | 131072 | model-config |
| [mistralai/Mistral-Small-24B-Instruct-2501](https://huggingface.co/mistralai/Mistral-Small-24B-Instruct-2501/blob/9527884be6e5616bdd54de542f9ae13384489724/README.md) | mistral | 32768 | model-config |
| [mistralai/Mistral-Small-3.2-24B-Instruct-2506](https://huggingface.co/mistralai/Mistral-Small-3.2-24B-Instruct-2506/blob/95a6d26c4bfb886c58daf9d3f7332c857cb27b43/README.md) | mistral | 131072 | model-config |
| [nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-BF16](https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-BF16/blob/bf77c3174f68ad409e1c2aa60daeb46e32d1c606/README.md) | nemotron_h | 262144 | model-config |
| [nvidia/NVIDIA-Nemotron-3-Nano-4B-BF16](https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Nano-4B-BF16/blob/dfaf35de3e30f1867dd8dbc38a7fc9fb52d3914f/README.md) | nemotron_h | 262144 | model-config |
| [nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-BF16](https://huggingface.co/nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-BF16/blob/a9904d24bcc1d289a1950fa9d2b978c47cf903b9/README.md) | nemotron_h | 262144 | model-config |
| [allenai/OLMo-2-1124-13B-Instruct](https://huggingface.co/allenai/OLMo-2-1124-13B-Instruct/blob/3a5c85baefbb1896a54d56fe2e76c0395627ddf4/README.md) | olmo2 | 4096 | model-config |
| [allenai/OLMo-2-1124-7B-Instruct](https://huggingface.co/allenai/OLMo-2-1124-7B-Instruct/blob/470b1fba1ae01581f270116362ee4aa1b97f4c84/README.md) | olmo2 | 4096 | model-config |
| [allenai/Olmo-3-7B-Instruct](https://huggingface.co/allenai/Olmo-3-7B-Instruct/blob/6e5971d9eba42665f5bd5a0fcf047f299ce1dccc/README.md) | olmo3 | 65536 | model-config |
| [allenai/Olmo-3-7B-Think](https://huggingface.co/allenai/Olmo-3-7B-Think/blob/d97e442d7cc678210054dbcc9b440894d62c89a4/README.md) | olmo3 | 65536 | model-config |
| [allenai/Olmo-3.1-32B-Instruct](https://huggingface.co/allenai/Olmo-3.1-32B-Instruct/blob/ac0587e4a7744a551c059d8cd17ba220bc940dae/README.md) | olmo3 | 65536 | model-config |
| [allenai/Olmo-3.1-32B-Think](https://huggingface.co/allenai/Olmo-3.1-32B-Think/blob/97ade57a9cc55ed48bcd76be4b7a3b6fee61b80d/README.md) | olmo3 | 65536 | model-config |
| [microsoft/Phi-3.5-mini-instruct](https://huggingface.co/microsoft/Phi-3.5-mini-instruct/blob/2fe192450127e6a83f7441aef6e3ca586c338b77/README.md) | phi3 | 131072 | model-config |
| [microsoft/Phi-4-mini-instruct](https://huggingface.co/microsoft/Phi-4-mini-instruct/blob/cfbefacb99257ffa30c83adab238a50856ac3083/README.md) | phi3 | 131072 | model-config |
| [microsoft/Phi-4-mini-reasoning](https://huggingface.co/microsoft/Phi-4-mini-reasoning/blob/0e3b1e2d02ee478a3743abe3f629e9c0cb722e0a/README.md) | phi3 | 131072 | model-config |
| [microsoft/Phi-4-reasoning](https://huggingface.co/microsoft/Phi-4-reasoning/blob/1de18ec97600877ce63dbf60c73b998da99f0195/README.md) | phi3 | 32768 | model-config |
| [microsoft/Phi-4-reasoning-plus](https://huggingface.co/microsoft/Phi-4-reasoning-plus/blob/69baf8528e1bcf05f475034d9e5dd32875ed125f/README.md) | phi3 | 32768 | model-config |
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
| [Qwen/Qwen3-Coder-Next](https://huggingface.co/Qwen/Qwen3-Coder-Next/blob/a7fbcb5c0e12d62a448eaa0e260346bf5dcc0feb/README.md) | qwen3_next | 262144 | model-config |
| [HuggingFaceTB/SmolLM2-1.7B-Instruct](https://huggingface.co/HuggingFaceTB/SmolLM2-1.7B-Instruct/blob/31b70e2e869a7173562077fd711b654946d38674/README.md) | llama | 8192 | model-config |
| [HuggingFaceTB/SmolLM2-135M-Instruct](https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct/blob/12fd25f77366fa6b3b4b768ec3050bf629380bac/README.md) | llama | 8192 | model-config |
| [HuggingFaceTB/SmolLM2-360M-Instruct](https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct/blob/a10cc1512eabd3dde888204e902eca88bddb4951/README.md) | llama | 8192 | model-config |
| [HuggingFaceTB/SmolLM3-3B](https://huggingface.co/HuggingFaceTB/SmolLM3-3B/blob/a07cc9a04f16550a088caea529712d1d335b0ac1/README.md) | smollm3 | 65536 | model-config |

### Unavailable curated candidates

These candidates were not counted toward coverage. Header failures mean the importer could not establish quantization within its bounded 8 MiB probe; they are not claims that a model is unavailable or unsupported by an inference runtime. Earlier failed candidates retain their earlier issue record.

- `bartowski/Meta-Llama-3-70B-Instruct-GGUF`: Missing verified base_model mapping.
- `bartowski/Meta-Llama-3-8B-Instruct-GGUF`: Missing verified base_model mapping.
- `bartowski/Mistral-7B-Instruct-v0.3-GGUF`: Missing verified base_model mapping.
- `bartowski/NVIDIA-Nemotron-3.5-Bolt-E4B-GGUF`: Missing verified base_model mapping.
- `bartowski/Phi-3-mini-128k-instruct-GGUF`: HTTP Error 401: Unauthorized.
- `bartowski/Phi-3-mini-4k-instruct-GGUF`: Missing verified base_model mapping.
- `bartowski/Qwen3.8-27B-GGUF`: Quantization absent from bounded GGUF metadata.
- `bartowski/Qwen_Qwen3.5-0.8B-GGUF`: Quantization absent from bounded GGUF metadata.
- `bartowski/Qwen_Qwen3.5-27B-GGUF`: Quantization absent from bounded GGUF metadata.
- `bartowski/Qwen_Qwen3.5-2B-GGUF`: Quantization absent from bounded GGUF metadata.
- `bartowski/Qwen_Qwen3.5-4B-GGUF`: Quantization absent from bounded GGUF metadata.
- `bartowski/Qwen_Qwen3.5-9B-GGUF`: Quantization absent from bounded GGUF metadata.
- `bartowski/gemma-4-12B-it-GGUF`: Quantization absent from bounded GGUF metadata.
- `bartowski/google_gemma-4-26B-A4B-it-GGUF`: Quantization absent from bounded GGUF metadata.
- `bartowski/google_gemma-4-31B-it-GGUF`: Quantization absent from bounded GGUF metadata.
- `bartowski/google_gemma-4-E2B-it-GGUF`: Quantization absent from bounded GGUF metadata.
- `bartowski/google_gemma-4-E4B-it-GGUF`: Quantization absent from bounded GGUF metadata.
- `bartowski/mistralai_Devstral-Small-2-24B-Instruct-2512-GGUF`: Quantization absent from bounded GGUF metadata.
- `bartowski/openai_gpt-oss-20b-GGUF`: Quantization absent from bounded GGUF metadata.
- `bartowski/zai-org_GLM-4.7-Flash-GGUF`: Quantization absent from bounded GGUF metadata.
