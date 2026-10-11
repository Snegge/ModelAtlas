export interface PitchSlide {
  title: string;
  points: readonly string[];
  durationSeconds: number;
  notes: string;
}

export const PITCH_SLIDES: readonly PitchSlide[] = [
  {
    title: "Lokale KI ausprobieren. Aber welches Modell?",
    points: [
      "Der Computer ist vorhanden.",
      "Die Aufgabe steht fest.",
      "Welches Modell passt dazu?",
    ],
    durationSeconds: 35,
    notes:
      "Stellt euch vor, ihr möchtet ein KI-Modell auf eurem eigenen Computer ausprobieren. Vielleicht soll es euch beim Programmieren helfen. Vielleicht möchtet ihr eure Eingaben nicht an einen externen Dienst schicken. Der Computer ist schon vorhanden. Die erste Frage klingt einfach: Welches Modell kann ich darauf überhaupt nutzen? Doch schon bei der Auswahl begegnen euch unterschiedliche Modellgrößen, Dateivarianten und Speicherangaben. Bevor ihr anfangen könnt, müsst ihr erst verstehen, welche Angaben für euren Computer entscheidend sind.",
  },
  {
    title: "Viele Angaben. Noch keine klare Entscheidung.",
    points: [
      "Ein Modell, mehrere Dateivarianten.",
      "Dateigröße ist nicht gleich Speicherbedarf.",
      "Mehr Kontext benötigt zusätzlichen Speicher.",
    ],
    durationSeconds: 40,
    notes:
      "Auf einer Modellseite steht die Anzahl der Parameter. Daneben gibt es verschiedene quantisierte Dateien. In der Dokumentation findet ihr Angaben zur Kontextlänge. Aber wie hängt das alles zusammen? Eine kleinere Datei erklärt noch nicht den gesamten Speicherbedarf. Ein längerer Kontext benötigt zusätzlichen Speicher. Und wenn ein Modell teilweise im Arbeitsspeicher läuft, sagt das noch nichts über seine Geschwindigkeit aus. Diese Zusammenhänge müssen Nutzerinnen und Nutzer selbst herstellen, obwohl ihnen dafür möglicherweise noch das technische Wissen fehlt.",
  },
  {
    title: "Unsicherheit führt zu Versuch und Irrtum.",
    points: [
      "Herunterladen, bevor die Anforderungen klar sind.",
      "Einstellungen ändern, ohne die Folgen zu verstehen.",
      "Alternativen nur schwer vergleichen können.",
    ],
    durationSeconds: 35,
    notes:
      "Aus dieser Unsicherheit wird schnell Versuch und Irrtum. Man lädt eine große Datei herunter, stößt auf eine Grenze und probiert anschließend eine andere Variante oder Einstellung. Das kostet Zeit. Und selbst wenn es funktioniert, bleibt die Frage: Warum funktioniert gerade diese Kombination? ModelAtlas setzt an diesem Problem an. Das Projekt soll technische Angaben so zusammenführen, dass daraus eine nachvollziehbare Entscheidung werden kann. Nutzerinnen und Nutzer sollen gezielter ausprobieren können, statt die Auswirkungen ihrer Einstellungen erraten zu müssen.",
  },
  {
    title: "ModelAtlas macht die Grenzen sichtbar.",
    points: [
      "Mit der eigenen Hardware beginnen.",
      "Modelle in einer gemeinsamen Ansicht erkunden.",
      "Die Gründe hinter einer Schätzung verstehen.",
    ],
    durationSeconds: 40,
    notes:
      "ModelAtlas verbindet die Hardware-Einstellungen mit den Informationen zu den Modellen in einer gemeinsamen Oberfläche. Statt mehrere Zahlen im Kopf zu behalten, sieht man die Modelle im Verhältnis zum eigenen Speicherbudget und zum gewünschten Kontext. Für eine konkrete Dateivariante lässt sich anschließend nachvollziehen, wie Modellgewichte, Cache und weitere Reserven zum geschätzten Speicherbedarf beitragen. Dabei bleibt sichtbar, wo die Aussage Grenzen hat: Eine passende Speicherschätzung ist noch keine Bestätigung der Laufzeitunterstützung und keine gemessene Aussage über die Geschwindigkeit.",
  },
  {
    title: "Was ändert sich, wenn ich etwas ändere?",
    points: [
      "Eine Einstellung verändern.",
      "Die Auswirkungen vergleichen.",
      "Eine fundiertere Entscheidung treffen.",
    ],
    durationSeconds: 30,
    notes:
      "Die zentrale Idee ist, Zusammenhänge durch Interaktion verständlich zu machen. Was passiert bei einem längeren Kontext? Was verändert eine andere Quantisierung? Und welche Alternative passt besser zu meinen Anforderungen? ModelAtlas macht diese Fragen direkt untersuchbar. Ich zeige euch jetzt am aktuellen Prototyp, wie die Oberfläche diese Abwägungen sichtbar macht und welche Prinzipien des Interaction Designs das Erkunden, Vergleichen und Verstehen unterstützen.",
  },
];
