# Hugging Face: lokale Zugangsdaten und Verbindungstests

Stand: 27.11.2026. Diese erste Anbindung prüft ausschließlich kostenlose Lesezugriffe. Sie importiert noch keine neuen Katalog- oder Score-Daten und führt keine Inferenz, HF Jobs oder kostenpflichtigen Dienste aus.

## Untersuchte Architektur

- Backend: ASP.NET Core / .NET 10; `CatalogService` liest `Data/catalog.json` beim Start. Die HTTP-Endpunkte geben explizite Katalog-/Schätzobjekte zurück, keine Konfiguration.
- Frontend: Angular; `AtlasStore` ruft relative `/api/...`-URLs auf. Der Entwicklungsproxy verbindet zum Backend. `localStorage` enthält Hardware-/Workspace-Einstellungen; dort gehört kein HF-Token hin.
- Persistenz: revisionierter JSON-Snapshot in `data/catalog.json`, keine Datenbank. Der bisherige Python-Importer liest öffentliche Hub-/GGUF-Metadaten und ersetzt Snapshots atomar. Er verwendet weiterhin keinen Token. Die neue Diagnose läuft vollständig im .NET-Backend, ohne Python-Abhängigkeit.
- Konfiguration: öffentliche Testziele in `server/ModelAtlas.Api/appsettings.json`; lokaler Token in **.NET User Secrets außerhalb des Repositorys**. Keine zusätzlichen NuGet-/npm-Abhängigkeiten.

## Token lokal eintragen (Windows / PowerShell)

1. Ein kostenloses HF-Konto verwenden. Unter [Access Tokens](https://huggingface.co/settings/tokens) einen Read-Token oder einen Fine-grained-Token mit den benötigten Leserechten erstellen. Schreibrechte, Inference-Rechte oder ein bezahlter Tarif sind für diese Tests nicht erforderlich. Bei gated Modellen muss das Konto unabhängig davon die Nutzungsbedingungen akzeptiert beziehungsweise eine Freigabe erhalten haben.
2. Im Repository-Stamm die leere Vorlage **einmalig** außerhalb des Repositorys anlegen und im Editor öffnen:

```powershell
$hfSecretsDir = Join-Path $env:APPDATA 'Microsoft\UserSecrets\ModelAtlas-HuggingFace-local'
New-Item -ItemType Directory -Force $hfSecretsDir | Out-Null
$hfSecretsFile = Join-Path $hfSecretsDir 'secrets.json'
if (-not (Test-Path -LiteralPath $hfSecretsFile)) {
    Copy-Item -LiteralPath '.\server\ModelAtlas.Api\secrets.example.json' -Destination $hfSecretsFile
}
notepad $hfSecretsFile
```

3. Im Editor den leeren Wert von `HuggingFace:Token` durch den echten Token ersetzen und speichern. Bei einer vorhandenen Datei diesen Schlüssel ergänzen; andere Secrets behalten. Der Token wird nicht in einen Terminalbefehl, Chat, Screenshot oder in eine Datei im Projekt kopiert.

Vorlageninhalt, ausdrücklich ohne Zugangsdaten:

```json
{
  "HuggingFace:Token": ""
}
```

Der genaue Windows-Speicherort lautet:

```text
%APPDATA%\Microsoft\UserSecrets\ModelAtlas-HuggingFace-local\secrets.json
```

Unter Linux/macOS liegt die Datei normalerweise unter `~/.microsoft/usersecrets/ModelAtlas-HuggingFace-local/secrets.json`. Die SDK-Projektdatei enthält die passende `UserSecretsId`; `dotnet user-secrets init` ist nicht mehr nötig.

Die CLI lädt User Secrets ausdrücklich auch ohne `Development`-Umgebung. Der normale ASP.NET-Webhost lädt sie nach dem .NET-Standard im Development-Modus. Als serverseitige Alternative unterstützt die Konfiguration `HuggingFace__Token` als Umgebungsvariable; diese hat Vorrang. Es gibt bewusst keinen Token-Kommandozeilenparameter und keine automatische Übernahme aus einem globalen `HF_TOKEN` oder HF-CLI-Login.

User Secrets liegen außerhalb von Git, sind aber **nicht verschlüsselt**. Sie sind für lokale Entwicklung gedacht. `dotnet user-secrets list`, HTTP-Debug-Traces und Konfigurationsdumps können Secrets ausgeben und sollen nicht für diese Diagnose verwendet werden.

## Verbindungstests starten

Aus dem Repository-Stamm, bei gestopptem Backend:

```powershell
dotnet run --project .\server\ModelAtlas.Api -- --probe-hf hub
dotnet run --project .\server\ModelAtlas.Api -- --probe-hf gguf
dotnet run --project .\server\ModelAtlas.Api -- --probe-hf benchmarks
```

Oder alle Quellen mit einer gemeinsamen Authentifizierungsprüfung:

```powershell
dotnet run --project .\server\ModelAtlas.Api -- --probe-hf all
```

Dabei startet kein Webserver. Mit Token wird zuerst `/api/whoami-v2` geprüft; Kontodaten und Authentifizierungsheader werden nicht ausgegeben. Bei ungültigem Token endet der Lauf, ohne unbemerkt anonym fortzufahren. Ohne Token laufen öffentliche Tests mit `missing_credentials_public_only`; das ist kein erfolgreicher Authentifizierungstest.

Exitcodes: **0** = authentifiziert, ausgewählte Tests ohne technischen Fehler; **1** = Verbindungs-/HTTP-/Format-/Konfigurationsfehler; **2** = Zugangsdaten fehlen (öffentliche Ergebnisse trotzdem nutzbar), ungültiges Tokenformat oder falscher Aufruf. Fehlende fachliche Felder sind im Bericht sichtbar, ohne einen funktionierenden HTTP-Zugriff als Fehler auszugeben. Exitcode 0 bedeutet deshalb keine vollständige Datenabdeckung.

Bei bereits laufendem Backend kann Windows dessen ausführbare Datei sperren. Ohne den laufenden Prozess zu beenden geht es auch mit einem getrennten Build-Verzeichnis:

```powershell
dotnet build .\server\ModelAtlas.Api -p:OutputPath=bin/HfProbe/
dotnet .\server\ModelAtlas.Api\bin\HfProbe\ModelAtlas.Api.dll --probe-hf all
```

Optional einen bereinigten Bericht lokal speichern (Ordner ist Git-ignoriert):

```powershell
New-Item -ItemType Directory -Force .\artifacts\hf-probes | Out-Null
dotnet .\server\ModelAtlas.Api\bin\HfProbe\ModelAtlas.Api.dll --probe-hf all > .\artifacts\hf-probes\latest.json
$LASTEXITCODE
```

## Was die Tests prüfen

| Quelle | Prüfung | Pagination / Umfang |
|---|---|---|
| Hub API | Modell-ID, Revision, Lizenz, Parameterzahl, Dateien, `model-index`, gepinnte `config.json`, Architektur-/Kontextfelder | Zwei Suchseiten über tatsächlichen `Link: rel=next`; Einzelmodellantwort separat |
| GGUF | Bestehendes gepinntes Katalogartefakt; Dateigröße, angekündigte SHA256; tatsächliche binäre Architektur-/Quantisierungsfelder | Binärer Header hat keine Pagination. Zunächst 512 KiB, bei unvollständigen Metadaten maximal 8 MiB; kein vollständiger Gewichtsdownload |
| Neue HF Benchmark API | Konfiguriertes Dataset/Task, Scores, Verifikationsstatus, Quellen-/PR-Metadaten; exakter Modell-ID-Abgleich mit allen 84 Katalogreleases | Aktuelle OpenAPI definiert keine Pagination für `/leaderboard`; nur Abdeckung der zurückgegebenen Zeilen wird behauptet |
| Ältere HF Benchmark-Ergebnisse | `open-llm-leaderboard/contents`: verfügbare Splits, tatsächliche Spalten, Rohmetriken, Precision und Modellrevision; gezielter Filter auf das Testmodell | `/rows` mit `offset=0/2`, `length=2`; zusätzlich `/filter` für exakt eine Modell-ID, maximal zwei Treffer; kein Vollscan |

Die Testziele lassen sich ohne Zugangsdaten in `appsettings.json` ändern. `ProbeModel` muss bereits im lokalen Katalog stehen; der GGUF-Test wählt dessen erstes vorhandenes Artefakt. `BenchmarkDataset` und `BenchmarkTask` müssen zusammenpassen. MMLU-Pro verwendet laut `eval.yaml` **`mmlu_pro`**, nicht `default`. Leere Resultate können auch einen falschen Task-Schlüssel bedeuten.

Die Tests lesen `RateLimit`, `RateLimit-Policy` und `Retry-After`, falls vorhanden. Fehlende Header bleiben unbekannt; es wird kein unbegrenztes Kontingent angenommen. Bei HTTP 429 stoppt der Lauf weitere Requests, statt das Kontingent durch Wiederholungen aufzubrauchen. Nicht durch Lasttests absichtlich ein Rate Limit auslösen.

## Fehler unterscheiden

| Bericht | Aussage / nächster Schritt |
|---|---|
| `missing_credentials_public_only` | Kein Token konfiguriert. Öffentliche Daten können trotzdem erreichbar sein. |
| `invalid_or_expired_credentials` | HTTP 401 bei der Identitätsprüfung. Token erneuern oder Konfiguration prüfen. |
| `permission_denied` / `resource_access_denied` | Zugriff verweigert. Tokenrechte, gated Freigaben und Organisationsrichtlinien prüfen; **kein Beleg für eine Tarifgrenze**. |
| `payment_required_no_paid_fallback` | HTTP 402; kein kostenpflichtiger Fallback. Die gewählten öffentlichen Leseendpunkte verlangen nach aktueller Dokumentation keinen bezahlten Tarif. |
| `not_found_or_hidden` | HTTP 404 kann eine fehlende oder absichtlich versteckte private Ressource bedeuten. Keine sichere Unterscheidung ohne zusätzliche Rechte. |
| `rate_limited` | HTTP 429; ausgewiesene Wartezeit respektieren. Auch kostenlose Kontingente sind begrenzt. |
| `absent` / `null` / `empty` | Zugriff war möglich, aber das einzelne Feld fehlt oder ist leer. Null/leer wird von einem echten numerischen Wert 0 unterschieden. |
| `network_error` / `timeout` | Netzwerkproblem; keine Aussage über Tokenrechte oder Tarif. |

Die CLI druckt keine Rohantworten, Fehlerantworttexte, Request-Header, signierten Download-URLs oder Exception-Details. Sie verwendet eine feste HTTPS-Hostliste und gibt den Bearer-Token nur an denselben vertrauenswürdigen API-Host, nie an einen Download-CDN, weiter. Antwortgrößen und Zeitlimits sind begrenzt. Secrets-Dateinamen und lokale Berichte sind Git-ignoriert; echte Tokens gehören trotzdem niemals in `appsettings.json`, Frontenddateien oder die leere Vorlage.

## Tatsächliche Ergebnisse vom 27.11.2026

Live-Lauf um 11:22 UTC, **ohne Zugangsdaten**. Alle ausgewählten öffentlichen Quellen waren erreichbar. Authentifizierter Zugriff sowie private/gated Berechtigungen wurden nicht live bestätigt. Kein Tariffehler und kein HTTP 429 traten auf; diese Fehlerpfade sind mit simulierten Antworten getestet.

- **Hub:** Zwei Suchseiten mit je zwei Einträgen erfolgreich. Für `Qwen/Qwen2.5-7B-Instruct` verfügbar: Revision `a09a35458c702b33eeacc393d103063234e8bc28`, Lizenz `apache-2.0`, 7.615.616.512 Parameter, Datei-/Größenangaben. `config.json` liefert 28 Layer, 28 Attention-Heads, 4 KV-Heads, Hidden Size 3584 und Kontext 32768. `head_dim` fehlt explizit. `sliding_window` ist zwar vorhanden, aber `use_sliding_window=false`: ein einzelnes Feld darf nicht isoliert als aktive Architekturentscheidung verwendet werden. `model-index=null`, keine `.eval_results/`-Dateien in dieser Modellantwort.
- **GGUF:** `bartowski/Qwen2.5-7B-Instruct-GGUF`, Revision `8911e8a47f92bac19d6f5c64a2e2095bd2f7d031`, Datei `Qwen2.5-7B-Instruct-Q4_K_M.gguf`: 4.683.074.240 Bytes, angekündigte SHA256 vorhanden. HTTP 206 und vollständige Metadaten innerhalb des 8-MiB-Ausschnitts. Tatsächlicher GGUF-Typ 15 (= Q4_K_M), Architektur `qwen2`, 28 Layer, 4 KV-Heads, Kontext 32768. Keine Prüfung des Hashs über die vollständige Datei.
- **Neue Benchmark API:** MMLU-Pro / `mmlu_pro` liefert 165 Zeilen. Sechs der 84 Katalogmodell-IDs kommen darin vor. Das ist nur die Abdeckung dieses einen zurückgegebenen Leaderboards, keine Aussage über alle HF-Benchmarks. Alle sechs Treffer melden `verified=false`. Werte und Quelleninformationen sind vorhanden; die geprüften Treffer enthalten keine explizite Modellrevision, Quantisierung oder Tokens/s. Ein Match auf Modell-ID reicht daher noch nicht für einen Score der exakten Katalogvariante.
- **Älterer Leaderboard-Datensatz:** 4576 Zeilen, `default/train`, Pagination liefert Zeilen 0/1 und 2/3. Felder enthalten `fullname`, `Model sha`, `Precision`, `Flagged`, Einreichungsdatum sowie IFEval, BBH, MATH Level 5, GPQA, MuSR und MMLU-Pro in Roh- und aufbereiteten Varianten. Der gezielte Qwen-Treffer ist **bfloat16**, nicht Q4_K_M; seine Revision `52e20a6f5f475e5c8f6a8ebda4ae5fa6b1ea22ac` weicht von unserer Katalogrevision ab. Keine unmarkierte Übertragung auf das GGUF-Artefakt. Vier Stichprobenzeilen plus ein Modellfilter belegen keine vollständige Katalogabdeckung.
- **Rate Limits:** Hub-Antworten meldeten für anonymen Zugriff 500 API-Requests beziehungsweise 3000 Resolver-Requests pro 300 Sekunden. Dataset-Viewer-Antworten lieferten in diesem Lauf keine Rate-Limit-Header. Kontingente sind beobachtete Werte und können sich ändern.

Das lokale maschinenlesbare Ergebnis liegt nach dem ausgeführten Test unter `artifacts/hf-probes/latest.json`. Dieser Bericht wird nicht versioniert. Die erste Datenlücke ist bereits belegt: Benchmark-Modellidentität, Revision und Quantisierung passen nicht automatisch zusammen. Qualitätswerte verschiedener Benchmark-Versionen oder Roh-/Normskalen dürfen nicht ungeprüft zusammengeführt werden. Für lokale Tokens/s liefern die geprüften Quellen noch keine Messdaten.

## Validierung und offizielle Quellen

```powershell
dotnet test .\server\ModelAtlas.Tests --no-restore -p:OutputPath=bin/HfProbe/
```

Die Tests prüfen Fehlerklassifikation, fehlende/Null-Felder, Pagination-Hostgrenzen, Redaktion, Tokenentfernung bei CDN-Weiterleitungen, ignorierte Range-Requests, Rate-Limit-Abbruch und GGUF-Parsing mit abgeschnittenen Daten. Frontend und Ranking wurden nicht verändert.

Vor der Implementierung geprüft:

- [HF Access Tokens](https://huggingface.co/docs/hub/security-tokens)
- [HF Hub API und aktuelle OpenAPI](https://huggingface.co/docs/hub/api), [OpenAPI JSON](https://huggingface.co/.well-known/openapi.json)
- [HF Rate Limits](https://huggingface.co/docs/hub/rate-limits)
- [HF GGUF](https://huggingface.co/docs/hub/gguf)
- [HF Evaluation Results](https://huggingface.co/docs/hub/eval-results), [MMLU-Pro Task-Konfiguration](https://huggingface.co/datasets/TIGER-Lab/MMLU-Pro/blob/main/eval.yaml)
- [HF Dataset Viewer Rows](https://huggingface.co/docs/dataset-viewer/rows), [Filter](https://huggingface.co/docs/dataset-viewer/filter)
- [.NET User Secrets](https://learn.microsoft.com/en-us/aspnet/core/security/app-secrets?view=aspnetcore-10.0)
