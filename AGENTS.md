# Repository instructions

For every UI change, read [docs/STYLE-GUIDE.md](docs/STYLE-GUIDE.md) before editing.
This is the visual contract for all contributors and coding agents in this repository.

- Reuse tokens in `client/src/theme.css` and existing shared rules/components.
- Do not add local palettes, raw colors, font sizes, or radii. Extend a semantic token only when an existing role cannot serve the requirement.
- Edit the owning rule; do not append another theme or specificity override to fix an inconsistency.
- Prefer Angular Material controls and Material Icons via `mat-icon` and `fontIcon`; no Unicode UI icons or handwritten SVG alternatives. Follow the icon mapping in the guide.
- Preserve keyboard interaction, focus visibility, accessible names, reduced motion, and status labels.
- Validate UI changes with `npm test --prefix client`, `npm run build --prefix client`, and the relevant Playwright flows (including desktop and mobile). Report checks you could not run.
- Update the guide and its contract tests together when intentionally changing the visual system.

Business logic, ranking, catalog fixtures, and persistence must not change as a side effect of styling.
