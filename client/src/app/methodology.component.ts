import { Component, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { DatePipe } from "@angular/common";
import { AtlasStore } from "./core/atlas.store";
@Component({
  selector: "atlas-methodology",
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `
    <div class="method-page">
      <a class="back-link" routerLink="/">← Return to the explorer</a>
      <div class="section-kicker">METHOD / PROVENANCE / LIMITS</div>
      <h1>Useful estimates. Visible uncertainty.</h1>
      <p class="method-lead">
        Model Atlas explores a narrow question: how might a real downloadable
        model’s memory requirements interact with your hardware and context
        settings?
      </p>
      <div class="method-grid">
        <section>
          <h2>What a point represents</h2>
          <p>
            Each point is a model release, including its size and
            instruction-tuned variant. One verified GGUF artifact represents it.
            The preferred quantization is chosen when available; otherwise the
            smallest complete artifact is used and labelled.
          </p>
          <p>
            Different quantizations are file sets of the same model release, not
            separate models. The detail panel lets you inspect and compare exact
            file sets.
          </p>
          <h2>Reading the constraint map</h2>
          <p>
            The horizontal axis is estimated full-residency memory in GiB. The
            vertical axis is the documented context limit in tokens on a
            logarithmic base-2 scale. A point in the shaded region meets the
            GPU-memory and documented-context constraints.
          </p>
          <p>
            Context limits are not measurements of effective context quality.
            Offloading can move weights into system RAM, so some points outside
            the GPU boundary are marked as possible offloads.
          </p>
          <h2>The memory estimate</h2>
          <div class="formula-block">
            KV bytes = 2 × layers × KV heads × head dimension × context tokens ×
            bytes per value × concurrent sequences
          </div>
          <p>
            Weights use actual bytes across the complete artifact file set.
            Runtime and compute overhead use 0.75 GiB plus 5% of weights. A 10%
            safety allowance applies to weights, cache and overhead. These
            planning heuristics are not measured runtime allocations.
          </p>
          <p>
            For offloading, cache, overhead and safety remain on the GPU; only
            weights are split. System RAM holds offloaded weights plus a 2 GiB
            host reserve. Separate dedicated GPU and RAM budgets are never
            summed into one pool. Unified-memory and CPU-only estimates are not
            supported.
          </p>
          <h2>Supported subset and uncertainty</h2>
          <p>
            Conventional Llama, Mistral, Qwen2/3, Gemma and Phi transformer
            architectures with complete layer, KV-head, head-dimension and
            context metadata are estimated. Sliding/local attention uses a
            conservative full-context cache upper bound. Mixture-of-experts,
            recurrent/hybrid or incomplete architectures are explicitly unknown.
          </p>
          <p>
            A memory fit does not verify runtime compatibility, architecture
            support, quantization accuracy or execution speed. No
            tokens-per-second or quality scores are fabricated.
          </p>
        </section>
        <aside>
          <section class="method-data">
            <h2>Bundled catalog</h2>
            @if (s.coverage(); as c) {
              <dl class="facts">
                <div>
                  <dt>Distinct releases</dt>
                  <dd>{{ c.releaseCount }}</dd>
                </div>
                <div>
                  <dt>Complete artifacts</dt>
                  <dd>{{ c.artifactCount }}</dd>
                </div>
                <div>
                  <dt>Snapshot retrieved</dt>
                  <dd>{{ c.retrievedAt | date: "medium" : "UTC" }} UTC</dd>
                </div>
                <div>
                  <dt>Importer</dt>
                  <dd>{{ c.importerVersion }}</dd>
                </div>
                <div>
                  <dt>Estimator</dt>
                  <dd>{{ c.estimatorVersion }}</dd>
                </div>
                <div>
                  <dt>Incomplete release metadata</dt>
                  <dd>{{ c.incompleteReleases }}</dd>
                </div>
              </dl>
              <h3>Coverage by family</h3>
              @for (f of c.families; track f.name) {
                <div class="family-coverage">
                  <span>{{ f.name }}</span
                  ><b>{{ f.count }}</b>
                </div>
              }
              <p class="small">
                Quantizations: {{ c.quantizations.join(", ") }}
              </p>
              <details>
                <summary>
                  Unavailable import sources ({{ c.importIssues.length }})
                </summary>
                @for (issue of c.importIssues; track issue.repository) {
                  <p class="small provenance">
                    {{ issue.repository }}: {{ issue.reason }}
                  </p>
                }
              </details>
            }
            <p>
              The snapshot is loaded locally by the backend. Normal exploration
              requires no external API credentials or network calls.
            </p>
          </section>
          <section>
            <h2>Traceability</h2>
            <p>
              Hugging Face model APIs provide repository revisions, file sizes,
              LFS checksums, model-card metadata and available parameter totals.
              Original configuration files provide architecture and context
              fields. When original configuration access is gated, bounded GGUF
              metadata from the artifact publisher supplies architecture/context
              fields and is labelled in details. This is a declared artifact
              context, rather than an independent runtime test.
            </p>
            <p>
              Actual quantization is validated against the GGUF
              <code>general.file_type</code> header. Headers use bounded HTTP
              Range requests; full weights are not downloaded during ingestion.
              Every artifact records its complete shard set and exact revision.
            </p>
            <a
              href="https://huggingface.co/docs/hub/api"
              target="_blank"
              rel="noopener noreferrer"
              >Hugging Face API documentation ↗</a
            ><br /><a
              href="https://github.com/ggml-org/ggml/blob/master/docs/gguf.md"
              target="_blank"
              rel="noopener noreferrer"
              >GGUF format specification ↗</a
            >
          </section>
          <section>
            <h2>Baseline versus scenario</h2>
            <p>
              A pinned baseline stays unchanged until you replace or clear it.
              Overview changes may choose a different representative artifact;
              these switches are labelled. Paired memory bars always evaluate
              the same exact artifact in both settings.
            </p>
            <p>
              Hardware, filters, selections and baseline are stored in your
              browser. Reset clears the exploration and restores defaults.
              Nothing is sent to an inference service.
            </p>
          </section>
        </aside>
      </div>
    </div>
  `,
})
export class MethodologyComponent {
  readonly s = inject(AtlasStore);
}
