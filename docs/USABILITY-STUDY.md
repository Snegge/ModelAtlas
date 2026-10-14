# Short usability-study plan

## Research question

Does the linked constraint map plus pinned what-if baseline help users understand hardware/context tradeoffs more accurately than a conventional filter-and-table interface using the same catalog and estimator?

## Participants and design

Recruit 8–12 university students with varied experience of local language models. Record prior experience and familiarity with GPU/RAM terms. Use a within-participant comparison with counterbalanced order (AB/BA). Explain the same brief glossary and memory-estimate limitations in both conditions.

- **A: Model Atlas** — hardware controls, scatterplot, linked table/details, baseline and exact-artifact comparison.
- **B: conventional filter-and-table** — the same dataset, settings, statuses, exact artifact details and CSV, arranged as a conventional table without spatial boundaries or pinned visual baseline. Implement B as a separate study condition before running the study; it is not a hidden mode or claimed deliverable of this prototype.

The condition bundles multiple interaction differences. Results measure the combined design, not the isolated effect of any one component.

## Tasks

Use verified artifacts available in the bundled snapshot; check target answers through the backend before each session.

1. Find two estimated full-GPU candidates for a 12 GiB GPU, 32 GiB RAM and 8,192-token context, then identify their exact artifacts and source cards.
2. Explain what changes when requested context increases to 32,768 tokens while hardware stays fixed. Identify a release that changes feasibility, if one exists for the preselected setup.
3. Investigate one release using Q4_K_M and Q8_0. Explain the distinction between changing artifacts and evaluating the same artifact under two contexts.
4. Reduce the GPU budget to 6 GiB, permit offloading, and identify the separate GPU/RAM implications.
5. Inspect the Qwen3-30B-A3B MoE release. Explain why Unknown differs from Outside constraints.
6. Recover after an empty search, restore the previous settings and export the visible configuration.

Use matched but different candidates/settings in the second condition to limit memorization. Pilot tasks to avoid impossible targets or naming clues.

## Measures

- Task correctness, completion time and number of recovery errors.
- Understanding of context limit versus runtime support, dedicated VRAM versus system RAM, and release versus exact artifact.
- Number of wrong “guaranteed execution” claims despite estimate wording.
- Recall of baseline values and errors when comparing changed quantizations.
- A short single-ease-question rating after each task, plus final preference and explanation.
- Think-aloud observations; note when chart/table/detail synchronization helps or causes confusion.

For this small exploratory sample, report individual outcomes and descriptive comparisons. Avoid population-level statistical claims unsupported by the sample. Keyboard-only observation and a narrow-screen walkthrough can supplement the core desktop study.

## Procedure and ethics

Obtain voluntary consent, allow withdrawal, and record anonymized participant IDs. No account, inference history or personal hardware identifier is needed. Collect only relevant task observations. Store recordings securely with a stated retention period. Debrief participants about uncertain memory estimates and the prototype’s unsupported architectures.

## Success indicators and iteration

The design should reduce incorrect memory/context interpretations and make baseline recovery reliable, without substantially increasing completion time. Look for missed fallback-quantization labels, ambiguity about offloading, overlapping points, small labels and difficulty finding retained selections. Prioritize observed issues in a second design iteration. No user-study results are claimed by this implementation.
