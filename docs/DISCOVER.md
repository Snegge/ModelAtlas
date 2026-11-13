# Discover implementation and validation

## Sources and scope
The local PNG, screens.json and ModelAtlas_Prototype.html were inspected in this conversation. No Figma file access is claimed. The supplied PDF exists as Refactoring UI v1.0.2-ZitatKaufanreiz.pdf; its extracted text remains in design-reference/refactoring-ui.txt. It is an excerpt: a contents entry alone is not evidence that a chapter's body was supplied. Applied, read sections include "Not all elements are equal", "Size isn't everything", "Limit your choices", and "Establish a spacing and sizing system". The reference directory is not an Angular asset input. No AGENTS.md was found in the repository.

Angular standalone components, the existing /discover route, WorkspaceStore, model release IDs and artifact comparison actions are reused. Ten static entries in discover-highlights.ts contain editorial descriptions and suggested tasks, not measured capabilities or trend rankings. Existing catalog values supply variant, parameter and estimated memory information. Unknown estimates remain explicitly unknown.

## Decisions
Persona requirements below come from the task brief, not interviews. UI choices are design assumptions to validate with users.

| User goal / persona | Requirement | UI decision | Reason | Validation |
| --- | --- | --- | --- | --- |
| Kevin (brief) | Understand a starting point and next step | Short carousel card; Learn more moves focus and scroll to detail heading | Orientation before technical detail; hierarchy through weight and spacing | Browser navigation and focus checks |
| Martin (brief) | Fast, justified shortlist | Shared stable-ID selection; compact ten-item list; variant and memory information | Selection remains consistent and assumptions stay inspectable | Cycle all ten; list/detail synchronization |
| Lukas (brief) | Starting points for own tests | Editorial reasons, suggested tasks and explicit estimate/runtime caveats | Avoid implying benchmark quality or hardware guarantees | Content review; existing detail links |
| All (design assumption) | Recognize horizontal navigation | Center card, clipped neighbors, position, cyclic buttons; no autoplay | Clear progression without forced timing | Buttons, arrow keys, synthetic touch at three widths |
| All (design assumption) | Read on small screens | Stacked details, bounded scrollable selection, flexible card height | Preserve context without page overflow | 390 / 768 / 1440 px checks |
| All (design assumption) | Consistent product controls | Existing blue tokens; shared 44px controls and 14px navigation | Earlier navigation was 11–12px and some controls had small hit areas | Model and methodology screenshots after shared changes |

The spacing vocabulary is predominantly 8/12/16/24/32/40/64px. Supporting text uses the existing muted token. Primary actions use the existing blue token. A readable main column takes precedence over equal-width boxes. These implement the read hierarchy and sizing sections above; touch targets, keyboard handling and reduced-motion behavior are general accessibility practices, not claims about unread book chapters.

## Shared changes and limits
Navigation text increases from 11–12px to 14px and has a 44px minimum target; the header can wrap. Quantization/view/action controls gain a 44px minimum height. Methodology paragraphs have a 72ch reading limit; the footer increases from 9px to 12px. Existing focus outlines and active navigation underline are retained. These changes address concrete legibility and touch-target issues observed in the running UI.

Broader future work: consolidate the accumulated global CSS overrides and revisit tiny catalog metadata consistently. That would affect more screens than this task requires.

## Checks
Production Angular build and 14 unit tests pass. No lint command is configured. Three dedicated Playwright scenarios pass at 390, 768 and 1440px: navigation, direct reload, ten unique catalog-backed highlights, cyclic buttons, arrow keys, synthetic pointer swipe, reduced motion, focus transfer, shared selection, comparison action and model detail navigation. Screenshots also cover methodology. API responses use the real bundled catalog with controlled test responses; backend estimation is not validated by these tests. Touch is simulated, not tested on physical hardware. The full legacy E2E suite was not run.

Screenshots: client/test-results/discover-{390,768,1440}.png and discover-details-{390,768,1440}.png; model and method captures share the same suffixes. The test-results directory is intentionally ignored.

## Carousel and collection revision
The entry now fills at least the available screen height and expands for small screens or enlarged text. It shows one complete model card, with icon-only previous/next controls on either side. Parameters, artifact variant controls, memory estimate, context limit, requested context, task guidance, caveats and direct model/comparison actions are available on the card. Neighbor previews were removed.

Four collection controls sit below the first screen. Highlights and carousel share selection; other collection selections do not change the carousel. Learn more restores Highlights before moving to the detail section.

New Releases, Most discussed and Popular are the top ten among the 84 bundled model repositories. Metadata was retrieved from public Hugging Face model and discussions endpoints and stored in discover-metadata.ts, with timestamp and per-model source links. New Releases sorts repository createdAt, explicitly distinguished from public release date. Popular sorts the API downloads field (30-day window). Most discussed sorts community thread count including pull requests; it is not a ranking of conversations across the internet. Missing fields fail the refresh rather than becoming zero. The existing catalog already supplies suitable candidates and complete artifacts, so no model records or backend contracts were changed.

Refresh: python scripts/refresh_discover.py (standard library only, network required). The application itself makes no new external requests. References: https://huggingface.co/docs/hub/api and https://huggingface.co/docs/hub/models-download-stats.

The heading follows the requested weekly wording; the subtitle explicitly explains that this prototype has no automatic weekly rotation. Supersedes the earlier clipped-neighbor and orientation-only carousel decisions above.
