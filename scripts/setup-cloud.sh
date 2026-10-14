#!/usr/bin/env bash
# Reusable, noninteractive setup for the isolated Codex checkout. Does not fetch model weights.
set -euo pipefail
cd /workspace/ModelAtlas
export DOTNET_CLI_HOME=/workspace/.cache/dotnet-cli
export NUGET_PACKAGES=/workspace/.cache/nuget
export npm_config_cache=/workspace/.cache/npm
export DOTNET_CLI_TELEMETRY_OPTOUT=1
mkdir -p /workspace/.tools /workspace/.cache/dotnet-cli /workspace/.cache/npm
if ! command -v dotnet >/dev/null 2>&1; then
  export DOTNET_ROOT=/workspace/.tools/dotnet
  export PATH="$DOTNET_ROOT:$PATH"
fi
if ! command -v dotnet >/dev/null 2>&1; then
  python3 - <<'PY'
import urllib.request, json, hashlib, tarfile
from pathlib import Path
base=Path('/workspace/.tools')
metadata=json.load(urllib.request.urlopen('https://builds.dotnet.microsoft.com/dotnet/release-metadata/10.0/releases.json'))
sdk=next(s for r in metadata['releases'] for s in r.get('sdks',[r['sdk']]) if s['version']=='10.0.401')
file=next(f for f in sdk['files'] if f['rid']=='linux-x64' and f['name'].endswith('.tar.gz'))
archive=base/'dotnet-sdk.tar.gz'
urllib.request.urlretrieve(file['url'],archive)
if hashlib.sha512(archive.read_bytes()).hexdigest()!=file['hash'].lower():
 archive.unlink();raise SystemExit('Official SDK SHA512 verification failed')
(base/'dotnet').mkdir(exist_ok=True)
with tarfile.open(archive) as t:t.extractall(base/'dotnet',filter='data')
archive.unlink()
print('Installed .NET 10.0.401 from official metadata with SHA512 verification.')
PY
fi
dotnet restore server/ModelAtlas.Tests --locked-mode
npm ci --prefix client --no-audit --no-fund
dotnet build server/ModelAtlas.Api --configuration Release --no-restore
npm run build --prefix client
