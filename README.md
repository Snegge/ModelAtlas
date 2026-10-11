# Model Atlas

A runnable Interaction Design prototype for exploring which **real local language-model artifacts might fit dedicated-GPU hardware**. Angular 22 standalone components, Signals, HttpClient and CDK; Apache ECharts; a minimal ASP.NET Core **.NET 10 LTS** API; a bundled, revision-pinned Hugging Face JSON catalog. No database, inference service, authentication or model-weight downloads.

Bundled coverage: **38 distinct releases, 114 artifacts, six families**, including verified multi-file artifacts.

The workspace starts with hardware controls and a linked constraint plot, searchable catalog and exact-artifact details. Pin a baseline, adjust hardware/context/quantization, inspect changes, keep up to three exact artifacts and export the current visible representatives as CSV.

Hardware budgets are fully editable. Comparison sits directly below the plot; adding an artifact from details brings it into view with keyboard focus. A pinned baseline stays fixed while the graph responds to live settings; clear it and pin again to choose a new reference.

## Prerequisites

- **Node.js 24 LTS** (tested: 24.19.0) and npm (tested: 11.9.0 and 12.2.0).
- **.NET SDK 10.0.401** (or a later patch in the 10.0.4xx feature band), pinned in `global.json`. .NET 10 is an LTS release.
- **Python 3.10+** only for catalog refresh and importer tests; the application itself needs no Python.
- Git. Installation needs npm/NuGet network access. Normal use needs **no external API credentials and no external API access**.

Official installers: [Node.js](https://nodejs.org/en/download), [.NET 10 SDK](https://dotnet.microsoft.com/en-us/download/dotnet/10.0), [Python](https://www.python.org/downloads/).

## Clone the implementation

```sh
git clone --branch prototype/interaction-design https://github.com/Snegge/ModelAtlas.git
cd ModelAtlas
```

## Linux startup

Install dependencies once from the repository root:

```sh
dotnet restore server/ModelAtlas.Tests --locked-mode
npm ci --prefix client
```

Terminal 1, repository root:

```sh
dotnet run --project server/ModelAtlas.Api --urls http://127.0.0.1:5050
```

Terminal 2, repository root:

```sh
npm start --prefix client
```

Open **http://127.0.0.1:4200** in your local browser. Health check:

```sh
curl --fail http://127.0.0.1:5050/api/health
```

## Windows PowerShell startup

From the repository root:

```powershell
dotnet restore .\server\ModelAtlas.Tests --locked-mode
npm.cmd ci --prefix .\client
```

Terminal 1:

```powershell
dotnet run --project .\server\ModelAtlas.Api --urls http://127.0.0.1:5050
```

Terminal 2:

```powershell
npm.cmd start --prefix .\client
```

Open **http://127.0.0.1:4200**. Health check:

```powershell
Invoke-RestMethod http://127.0.0.1:5050/api/health
```

The Angular development proxy forwards `/api/**` to port 5050; no manual CORS configuration is required. Stop each process with Ctrl+C. Servers bind to loopback for local development. Processes must be started again after restoring a cloud environment snapshot.

The npm funding notice is informational. npm 12 requires approval for dependency install scripts: `client/package.json` includes exact-version approvals for the four reviewed native build helpers (`@parcel/watcher`, `esbuild`, `lmdb`, `msgpackr-extract`). A clean `npm ci --prefix client` uses these approvals automatically. If dependency updates introduce a new script or version, review it with `npm install-scripts ls --prefix client` before approving that specific package. Avoid blanket approvals or `npm audit fix --force`; use `npm audit --prefix client` to inspect advisories and test targeted dependency updates.

## VS Code

Open this repository folder. **Terminal → Run Task → Model Atlas: start both** launches the API and Angular development server. Individual frontend/backend tasks are also provided. The **validate** tasks run the production build and unit tests. Install Node and .NET first; run dependency installation before the launch tasks.

## Validation

Run tests/builds before launching servers (or stop the backend first on Windows, where output assemblies may be locked):

```sh
dotnet test server/ModelAtlas.Tests --no-restore
dotnet build server/ModelAtlas.Api --configuration Release --no-restore
npm test --prefix client
npm run build --prefix client
python3 -m unittest discover -s scripts -p 'test_*.py'
```

PowerShell equivalents:

```powershell
dotnet test .\server\ModelAtlas.Tests --no-restore
dotnet build .\server\ModelAtlas.Api --configuration Release --no-restore
npm.cmd test --prefix .\client
npm.cmd run build --prefix .\client
py -3 -m unittest discover -s scripts -p "test_*.py"
```

Browser tests require both servers running at the ports above:

```sh
cd client
npx playwright install chromium
npm run test:e2e
```

PowerShell: `npx.cmd playwright install chromium`, then `npm.cmd run test:e2e`. Linux CI may require `npx playwright install --with-deps chromium`. To reuse an installed Chromium, set `CHROMIUM_PATH` to its executable before running the tests. Screenshots and reports are generated in ignored `client/test-results/`.

Tests cover the estimator, real artifact sizes, unknown metadata, dedicated-memory accounting, baseline reversibility, selection synchronization, comparison limits, empty searches, persistence, cancelled evaluations, CSV consistency, narrow-screen overflow and WCAG-tagged axe checks. Automated accessibility checks complement manual keyboard and screen-reader testing; they do not certify accessibility.

## Catalog refresh

The bundled `data/catalog.json` is sufficient to run the app. To reproduce/refresh public metadata, from the repository root:

```sh
python3 scripts/import_catalog.py --workers 4
```

PowerShell:

```powershell
py -3 .\scripts\import_catalog.py --workers 4
```

No Hugging Face token is required for the selected public artifacts. The importer checks exact repository revisions, complete shard sets, LFS checksums and sizes, original architecture configurations, and actual GGUF quantization headers. Each header request is bounded to 512 KiB initially and at most 8 MiB on retry; full model weights are not downloaded. Some original configuration files are gated; the importer uses linked GGUF architecture metadata when available. See [DATA-SOURCES.md](docs/DATA-SOURCES.md) for coverage and limitations.

Network destinations for refresh: `huggingface.co` and its observed artifact redirect host `us.aws.cdn.hf.co` (other deployments may redirect to `cas-bridge.xethub.hf.co`). A failed/incomplete refresh leaves the last valid snapshot intact. Unavailable curated candidates are reported, never fabricated. Restart the backend after refreshing; it loads a single immutable snapshot at startup.

## Project layout

```text
client/src/app/core/         shared Signals state, validated persistence, CSV
client/src/app/components/  hardware, ECharts plot, catalog, details, memory, comparison
server/ModelAtlas.Api/       immutable catalog access, estimator, HTTP endpoints
server/ModelAtlas.Tests/     estimator and real-snapshot tests
data/                       populated catalog and curated import sources
scripts/                    standard-library Python importer and cloud setup
.vscode/                    development tasks
```

API: `GET /api/catalog?search=&family=&quantization=`, `GET /api/models/{id}`, `GET /api/artifacts/{id}`, `POST /api/evaluate`, `POST /api/scenarios`, `GET /api/catalog/status`, `GET /api/health`. Evaluation bodies contain `settings` and optional `baseline`; the backend returns every release representative and every exact-artifact estimate. Filters do not truncate the overall distribution; the table is paginated independently.

See [DESIGN-RATIONALE.md](docs/DESIGN-RATIONALE.md), [USABILITY-STUDY.md](docs/USABILITY-STUDY.md) and [VALIDATION.md](docs/VALIDATION.md).

## Limits

Memory fit is an **estimate**, not a promise of successful execution or runtime compatibility. File bytes approximate weight residency; cache allocation and overhead vary. Only conventional transformer metadata is estimated. MoE and unsupported/incomplete architectures are explicitly unknown. Unified-memory, CPU-only execution and multi-GPU placement are outside this prototype. No quality rankings, unverified runtime commands or tokens-per-second predictions are included.
