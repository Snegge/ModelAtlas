# ModelAtlas project pitch

A three-minute pitch leading from the user's uncertainty to the current live prototype. Open **Project pitch** in the application header, or visit **http://127.0.0.1:4200/pitch** after starting both development servers. Direct navigation and refresh use the existing Angular route handling.

## Presenting

- **Previous / Next** change slides. Focus the slide itself for **Left / Right**, **Home / End** shortcuts; shortcuts leave focused controls and editable elements alone.
- **Enter fullscreen / Exit fullscreen** use the browser Fullscreen API. Fullscreen belongs to the application shell and stays active when **Open live demo** opens the Explorer. An **Exit fullscreen** button remains available in the demo; browser Escape is synchronized when the browser exits fullscreen.
- **Speaker notes** are collapsed by default. On a mirrored projector, opening them shows the notes to the audience. This is **not a private presenter display**. Use this document on another device for the full script.
- Slides advance only on request. The progress indicator and short illustration fades respect reduced motion. Navigation and presentation controls remain English; slides, diagram descriptions and scripts are German.

## Timing

| Slide | Approximate duration | Cumulative time |
| ----- | -------------------- | --------------- |
| 1     | 35 seconds           | 0:35            |
| 2     | 40 seconds           | 1:15            |
| 3     | 35 seconds           | 1:50            |
| 4     | 40 seconds           | 2:30            |
| 5     | 30 seconds           | 3:00            |

The three minutes include the introduction to the demo, not the live exploration itself. Rehearse at a conversational pace and adjust pauses as needed.

## German speaker notes

### Slide 1 — Lokale KI ausprobieren. Aber welches Modell?

Approximate duration: **35 seconds**.

Stellt euch vor, ihr möchtet ein KI-Modell auf eurem eigenen Computer ausprobieren. Vielleicht soll es euch beim Programmieren helfen. Vielleicht möchtet ihr eure Eingaben nicht an einen externen Dienst schicken. Der Computer ist schon vorhanden. Die erste Frage klingt einfach: Welches Modell kann ich darauf überhaupt nutzen? Doch schon bei der Auswahl begegnen euch unterschiedliche Modellgrößen, Dateivarianten und Speicherangaben. Bevor ihr anfangen könnt, müsst ihr erst verstehen, welche Angaben für euren Computer entscheidend sind.

### Slide 2 — Viele Angaben. Noch keine klare Entscheidung.

Approximate duration: **40 seconds**.

Auf einer Modellseite steht die Anzahl der Parameter. Daneben gibt es verschiedene quantisierte Dateien. In der Dokumentation findet ihr Angaben zur Kontextlänge. Aber wie hängt das alles zusammen? Eine kleinere Datei erklärt noch nicht den gesamten Speicherbedarf. Ein längerer Kontext benötigt zusätzlichen Speicher. Und wenn ein Modell teilweise im Arbeitsspeicher läuft, sagt das noch nichts über seine Geschwindigkeit aus. Diese Zusammenhänge müssen Nutzerinnen und Nutzer selbst herstellen, obwohl ihnen dafür möglicherweise noch das technische Wissen fehlt.

### Slide 3 — Unsicherheit führt zu Versuch und Irrtum.

Approximate duration: **35 seconds**.

Aus dieser Unsicherheit wird schnell Versuch und Irrtum. Man lädt eine große Datei herunter, stößt auf eine Grenze und probiert anschließend eine andere Variante oder Einstellung. Das kostet Zeit. Und selbst wenn es funktioniert, bleibt die Frage: Warum funktioniert gerade diese Kombination? ModelAtlas setzt an diesem Problem an. Das Projekt soll technische Angaben so zusammenführen, dass daraus eine nachvollziehbare Entscheidung werden kann. Nutzerinnen und Nutzer sollen gezielter ausprobieren können, statt die Auswirkungen ihrer Einstellungen erraten zu müssen.

### Slide 4 — ModelAtlas macht die Grenzen sichtbar.

Approximate duration: **40 seconds**.

ModelAtlas verbindet die Hardware-Einstellungen mit den Informationen zu den Modellen in einer gemeinsamen Oberfläche. Statt mehrere Zahlen im Kopf zu behalten, sieht man die Modelle im Verhältnis zum eigenen Speicherbudget und zum gewünschten Kontext. Für eine konkrete Dateivariante lässt sich anschließend nachvollziehen, wie Modellgewichte, Cache und weitere Reserven zum geschätzten Speicherbedarf beitragen. Dabei bleibt sichtbar, wo die Aussage Grenzen hat: Eine passende Speicherschätzung ist noch keine Bestätigung der Laufzeitunterstützung und keine gemessene Aussage über die Geschwindigkeit.

### Slide 5 — Was ändert sich, wenn ich etwas ändere?

Approximate duration: **30 seconds**.

Die zentrale Idee ist, Zusammenhänge durch Interaktion verständlich zu machen. Was passiert bei einem längeren Kontext? Was verändert eine andere Quantisierung? Und welche Alternative passt besser zu meinen Anforderungen? ModelAtlas macht diese Fragen direkt untersuchbar. Ich zeige euch jetzt am aktuellen Prototyp, wie die Oberfläche diese Abwägungen sichtbar macht und welche Prinzipien des Interaction Designs das Erkunden, Vergleichen und Verstehen unterstützen.

## Suggested live-demo handoff

The final **Open live demo** action navigates to the existing Explorer route (`/`). Hardware settings, focused exact artifact, comparison selections, filters and pinned baseline remain in the shared application store. No demo settings are silently substituted.

Begin with the current hardware and one exact artifact. Pin a baseline if useful, change requested context, and inspect the paired memory breakdown. Then compare another exact quantization. Keep the distinction between changing settings for the same artifact and selecting a different file clear. Clear or restore the baseline when appropriate.

The constraint map on slide 4 is labelled **Schematische Darstellung** and contains no measured catalog data. File size is an estimation input; memory fit does not confirm runtime support, speed or quality. The presentation makes no claim of automatic model installation, inference or a universally best model. Catalog statistics are intentionally omitted so the pitch cannot display stale counts.
