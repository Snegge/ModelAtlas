# Model Atlas

Model Atlas helps you explore which language-model files might fit your computer's memory. Enter a hardware budget, change settings and compare models before deciding what to download.

This is a university Interaction Design prototype. It shows **memory estimates**; it does not install or run models. You do not need a powerful GPU to try the interface. The included catalog contains **38 model releases and 114 downloadable variants across six families**.

## Start here

You can run the project with VS Code and three additional tools: **Git, Node.js and the .NET SDK**. The steps below explain how to install them, get the code and start the app. Internet access is needed for installation. The app then uses the catalog included in this repository, without API keys or external model services.

The app runs as two programs:

- **Frontend:** the Angular interface you see in your browser, at port **4200**.
- **Backend:** the C# API that reads the catalog and calculates estimates, at port **5050**.

Both must be running. You will use one VS Code terminal for each.

## 1. Install the required tools

VS Code is the editor. Install these tools separately using their official websites:

| Tool | What it does here | What to install |
|---|---|---|
| [Git](https://git-scm.com/downloads) | Copies the repository onto your computer. | The version offered for your operating system. |
| [Node.js](https://nodejs.org/en/download) | Runs Angular's development tools. Includes **npm**, which installs JavaScript dependencies. | **Node.js 24 LTS**. Select version 24 rather than the Current release. |
| [.NET SDK](https://dotnet.microsoft.com/en-us/download/dotnet/10.0) | Builds and runs the C# backend. | **SDK 10.0.401**, or a newer **10.0.4xx** patch. Choose the **SDK**, not just the Runtime. |

On Windows, use the installers and keep their default options. On macOS and Linux, follow the installation instructions for your operating system on those pages. Choose **x64** for an Intel/AMD computer or **Arm64** for an ARM computer, such as an Apple Silicon Mac.

The SDK version matters: [global.json](global.json) pins the project to the 10.0.4xx SDK series. A different .NET 10 SDK series alone may not satisfy that requirement.

You do **not** need Python, a global Angular CLI installation, Visual Studio, Docker or a database to start the app. VS Code extensions are optional; Angular Language Service and C# Dev Kit can help later when editing code.

**After installing, close all VS Code windows and reopen VS Code.** This lets new terminals find the installed tools.

### Check the installation

In VS Code, select **Terminal → New Terminal**. On Windows, use **PowerShell**; choose it from the terminal profile dropdown if needed.

**Windows PowerShell:**

```powershell
git --version
node --version
npm.cmd --version
dotnet --list-sdks
```

**Linux or macOS:**

```sh
git --version
node --version
npm --version
dotnet --list-sdks
```

Each command should print a version. Node should start with `v24.`. The .NET list should contain `10.0.401` or a later `10.0.4xx` patch. If a command is not found, check that the corresponding tool is installed and restart VS Code before continuing.

The Windows instructions use `npm.cmd` so they work even when PowerShell blocks the `npm.ps1` script. You do not need to change PowerShell's execution policy.

## 2. Download and open the project

If you already have this repository, open its folder in VS Code and use the `prototype/interaction-design` branch. You can skip the clone commands below.

For a new copy, run these commands in the VS Code terminal. They create a `ModelAtlas` folder inside your user folder.

**Windows PowerShell:**

```powershell
cd $env:USERPROFILE
git clone --branch prototype/interaction-design --single-branch https://github.com/Snegge/ModelAtlas.git
cd ModelAtlas
```

**Linux or macOS:**

```sh
cd ~
git clone --branch prototype/interaction-design --single-branch https://github.com/Snegge/ModelAtlas.git
cd ModelAtlas
```

Then select **File → Open Folder…** in VS Code and open that **ModelAtlas** folder. Open a new terminal there.

You should see `README.md`, `client`, `server` and `data` in the VS Code Explorer. This folder is the **repository root**. Run the following commands from this folder, rather than from inside `client` or `server`.

To check the branch:

```sh
git branch --show-current
```

It should print `prototype/interaction-design`. For an existing checkout that has another branch selected, run `git fetch origin` and then `git switch prototype/interaction-design`. If Git reports uncommitted changes, keep those changes safe before switching; do not discard them just to follow this guide.

## 3. Install the project dependencies

Dependencies are libraries the project uses. Run these commands once after downloading the project and wait for both to finish.

**Windows PowerShell:**

```powershell
dotnet restore .\server\ModelAtlas.Tests --locked-mode
npm.cmd ci --prefix .\client
```

**Linux or macOS:**

```sh
dotnet restore server/ModelAtlas.Tests --locked-mode
npm ci --prefix client
```

The first command installs the C# API and test dependencies. The second installs the frontend dependencies. `--locked-mode` and `npm ci` use the dependency versions recorded in the repository.

The first installation may take a few minutes. The message `packages are looking for funding` is informational. This repository includes approvals for its required npm install scripts; you should not need to approve them manually for the bundled dependency versions.

## 4. Start the backend

In your first terminal, from the repository root:

**Windows PowerShell:**

```powershell
dotnet run --project .\server\ModelAtlas.Api --urls http://127.0.0.1:5050
```

**Linux or macOS:**

```sh
dotnet run --project server/ModelAtlas.Api --urls http://127.0.0.1:5050
```

Wait for a message like:

```text
Now listening on: http://127.0.0.1:5050
```

**Leave this terminal running.** It is normal that the command does not finish or return to the prompt.

## 5. Start the frontend and open the app

Select **Terminal → New Terminal** again, or use the **+** button in the terminal panel. Keep the backend terminal open. Check that the new terminal is also in the repository root.

In this second terminal:

**Windows PowerShell:**

```powershell
npm.cmd start --prefix .\client
```

**Linux or macOS:**

```sh
npm start --prefix client
```

Wait until Angular prints a local address, then open **[http://127.0.0.1:4200](http://127.0.0.1:4200)** in your browser. Leave this terminal running too.

You should see hardware controls, a model plot, a searchable catalog and model details. The browser interface is on **4200**; opening **5050** alone will not show the interface.

`127.0.0.1` means your own computer. The frontend forwards API requests to the backend automatically, so you do not need to configure CORS or change API URLs.

### Stop and start again later

Press **Ctrl+C** in each terminal to stop the app. If Windows asks `Terminate batch job (Y/N)?`, enter `Y`.

Next time, open the project in VS Code and repeat **steps 4 and 5**. You do not need to reinstall the tools, clone the repository or install dependencies every day. Repeat step 3 after pulling changes that update dependencies.

### Optional: use the included VS Code tasks

After completing step 3, select **Terminal → Run Task… → Model Atlas: start both**. This launches the backend and frontend in separate task terminals. Wait for both to be ready, then open the same browser address.

On Windows, if the frontend task reports that `npm.ps1` cannot be loaded, use the manual `npm.cmd` command in step 5 instead. The manual commands are also useful when diagnosing startup problems.

## Try the explorer

1. Set your **GPU memory** and **system memory (RAM)** budgets. The values describe the hardware you want to explore; the app does not detect your computer automatically.
2. Choose a **requested context**: the amount of prompt and response text to budget for, measured in tokens. Longer context usually needs more cache memory for supported models.
3. Select a model in the plot or catalog. In the details panel, choose an exact downloadable variant to inspect its estimated memory breakdown and source links.
4. Use **Compare this exact artifact** to keep up to three variants below the plot. A variant is a particular file or complete file set, such as a Q4 or Q8 quantized version of the same model release.
5. Use **Pin as baseline**, then change a setting. The pinned settings stay fixed for comparison. **Restore baseline** undoes your scenario changes; **Clear baseline** removes the reference.

**Quantization** stores model weights with fewer bits, usually reducing their size. The app compares memory requirements; it does not measure the quality or speed of those variants.

Hardware settings, baseline and saved exploration selections stay in local browser storage. **Reset exploration to defaults** is available in the hardware panel. Open **Chart info** for guidance about the plot, or **Method & data** for sources and estimation limits.

## If something does not work

| What you see | What to check |
|---|---|
| `git`, `node`, `npm` or `dotnet` is not recognized / command not found | Install the corresponding tool from step 1, then close and reopen VS Code. |
| `.NET`: a compatible SDK was not found | Run `dotnet --list-sdks`. Install SDK **10.0.401** or a newer **10.0.4xx** patch; installing only the Runtime is not enough. |
| PowerShell says `npm.ps1 cannot be loaded` | Use `npm.cmd` as shown in the Windows instructions. |
| A project file or `package.json` cannot be found | Run the command from the **ModelAtlas root folder**. It contains both `client` and `server`. |
| Port 5050 or 4200 is already in use | Check for another running copy in your terminals and stop it with Ctrl+C. If Angular offers another port, decline and free port 4200 to keep the documented addresses. |
| The interface loads, but the catalog or estimates do not | Check the backend terminal. Open [the backend health check](http://127.0.0.1:5050/api/health); it should show JSON containing `"status":"ok"`. Both terminals must stay running. |
| Dependency installation cannot download packages | Check your internet connection and any university network/proxy restrictions, then rerun step 3. |
| `git clone` says the destination already exists | Open the existing `ModelAtlas` folder, or choose another parent folder for a new copy. |

If npm reports security advisories, inspect them with `npm.cmd audit --prefix client` on Windows or `npm audit --prefix client` on Linux/macOS. Avoid `npm audit fix --force`: it can change dependency versions incompatibly. The committed dependency versions were validated; advisories can change after that validation.

## Optional: tests and builds

These checks are useful when changing code. They are not required just to open the app. Stop the running servers first, especially on Windows, where the backend can lock its build files. All commands below run from the repository root.

**Windows PowerShell:**

```powershell
dotnet test .\server\ModelAtlas.Tests --no-restore
npm.cmd test --prefix .\client
dotnet build .\server\ModelAtlas.Api --configuration Release --no-restore
npm.cmd run build --prefix .\client
```

**Linux or macOS:**

```sh
dotnet test server/ModelAtlas.Tests --no-restore
npm test --prefix client
dotnet build server/ModelAtlas.Api --configuration Release --no-restore
npm run build --prefix client
```

The VS Code task **Model Atlas: validate** also runs the backend tests, frontend tests and frontend build.

For browser tests, install Playwright's test browser, then start both servers as in steps 4 and 5. Run the tests in a **third** terminal at the repository root:

**Windows PowerShell:**

```powershell
npm.cmd exec --prefix .\client -- playwright install chromium
npm.cmd run test:e2e --prefix .\client
```

**Linux or macOS:**

```sh
npm exec --prefix client -- playwright install chromium
npm run test:e2e --prefix client
```

On Linux, Playwright may request additional system libraries; its `install --with-deps chromium` option installs them and may require administrator access. Screenshots and reports go into the ignored `client/test-results/` folder. See [validation evidence](docs/VALIDATION.md) for what has been tested and what remains unverified.

## Optional: refresh the model catalog

The app already includes `data/catalog.json`. You can skip this section for normal use.

To fetch updated public Hugging Face metadata, install [Python 3.10 or newer](https://www.python.org/downloads/) and run from the repository root:

**Windows PowerShell:**

```powershell
py -3 .\scripts\import_catalog.py --workers 4
```

**Linux or macOS:**

```sh
python3 scripts/import_catalog.py --workers 4
```

This command reads model metadata and small portions of file headers; it does not download complete model weights. No Hugging Face token is required for the selected public records. A failed refresh preserves the last valid catalog. Restart the backend after a successful refresh so it reads the updated file.

Python's importer tests are also optional:

```powershell
# Windows PowerShell
py -3 -m unittest discover -s scripts -p "test_*.py"
```

```sh
# Linux or macOS
python3 -m unittest discover -s scripts -p 'test_*.py'
```

See [data sources and coverage](docs/DATA-SOURCES.md) for provenance, missing metadata and importer details.

## Where to find the code

| Folder | Contents |
|---|---|
| `client/src/app/components/` | Angular hardware controls, chart, catalog, details and comparison. |
| `client/src/app/core/` | Shared application state, browser storage and CSV export. |
| `server/ModelAtlas.Api/` | C# catalog loading, API endpoints and memory estimation. |
| `server/ModelAtlas.Tests/` | Backend tests. |
| `data/` | The bundled catalog and model sources used by the importer. |
| `scripts/` | Catalog importer, its tests and a script for the Codex cloud environment. |
| `.vscode/` | VS Code tasks. |

The frontend uses Angular 22, Angular CDK and ECharts. The backend uses ASP.NET Core on .NET 10 LTS, with JSON files instead of a database. It supports memory estimation for conventional transformers with sufficient architecture metadata. Unsupported models, mixture-of-experts models and incomplete records are labelled **Unknown**.

A memory fit is an estimate, not a guarantee that an inference runtime supports a model or that it will run successfully. CPU-only, unified-memory and multi-GPU configurations are outside this prototype. There are no speed predictions or quality rankings.

More project documentation: [design rationale](docs/DESIGN-RATIONALE.md), [usability-study plan](docs/USABILITY-STUDY.md), [data sources](docs/DATA-SOURCES.md) and [validation](docs/VALIDATION.md).
