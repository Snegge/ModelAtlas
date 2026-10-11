import { Component, inject, output } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { DatePipe } from "@angular/common";
import { AtlasStore } from "../core/atlas.store";
import { STATUS_SYMBOL } from "../core/models";
import { MemoryComponent } from "./memory.component";
@Component({
  selector: "atlas-detail",
  standalone: true,
  imports: [FormsModule, DatePipe, MemoryComponent],
  template: `
    <aside class="detail-panel" aria-labelledby="detail-heading">
      <div class="section-kicker">DETAILS / EXACT ARTIFACT</div>
      @if (s.focusedRelease(); as r) {
        @let a = s.focusedArtifact()!;@let e = s.focusedEstimate();
        <div class="detail-family">
          {{ r.family }} <span>{{ r.publisher }}</span>
        </div>
        <h2 id="detail-heading">{{ r.name }}</h2>
        @if (!s.focusedVisible()) {
          <p class="outside-filter">
            Selected release is outside the current filters. Selection retained.
          </p>
        }
        <label for="detail-artifact">Inspect an exact artifact</label
        ><select
          id="detail-artifact"
          [ngModel]="a.id"
          (ngModelChange)="s.focusArtifact($event)"
        >
          @for (v of s.variants(r.id); track v.id) {
            <option [value]="v.id">
              {{ v.quantization }} ·
              {{ (v.sizeBytes / 1073741824).toFixed(2) }} GiB file set
            </option>
          }
        </select>
        <p class="control-help">
          This selection is exact. Hardware quantization preferences change the
          overview representative only.
        </p>
        @if (e) {
          <div [class]="'detail-status ' + e.scenario.status">
            <span>{{ symbols[e.scenario.status] }}</span>
            <div>
              <strong>{{ s.label[e.scenario.status] }}</strong
              ><small>Runtime compatibility: unverified</small>
            </div>
          </div>
          <h3>Estimated full-residency memory</h3>
          <atlas-memory [estimate]="e.scenario" [baseline]="e.baseline" />
          @if (e.scenario.status === "offload") {
            <p class="offload-note">
              Planned GPU residency:
              {{ e.scenario.gpuRequiredGiB!.toFixed(2) }} GiB. Separate RAM
              requirement: {{ e.scenario.systemRequiredGiB!.toFixed(2) }} GiB,
              including host reserve.
            </p>
          }
          @for (reason of e.scenario.reasons; track reason) {
            <p class="estimate-reason">{{ reason }}</p>
          }
          @for (line of s.explanation(a.id); track line) {
            <p class="insight">↳ {{ line }}</p>
          }
        }
        <button
          class="button primary full"
          (click)="compare(a.id)"
          [attr.aria-pressed]="s.comparisons().includes(a.id)"
        >
          {{
            s.comparisons().includes(a.id)
              ? "Remove from comparison"
              : "Compare this exact artifact"
          }}
          <span>{{ s.comparisons().includes(a.id) ? "−" : "+" }}</span>
        </button>
        <dl class="facts">
          <div>
            <dt>Total stored parameters</dt>
            <dd>
              {{
                r.totalParameters
                  ? (r.totalParameters / 1e9).toFixed(2) + " billion"
                  : "Unknown"
              }}
            </dd>
          </div>
          <div>
            <dt>Documented context</dt>
            <dd>
              {{
                r.contextLimit
                  ? r.contextLimit.toLocaleString() + " tokens"
                  : "Unknown"
              }}<span class="tiny muted">{{
                r.contextSource === "artifact-gguf-header"
                  ? "Artifact GGUF metadata"
                  : "Original model configuration"
              }}</span>
            </dd>
          </div>
          <div>
            <dt>Architecture</dt>
            <dd>{{ r.architecture.type ?? "Unknown" }}</dd>
          </div>
          <div>
            <dt>License</dt>
            <dd>
              <a [href]="r.licenseUrl" target="_blank" rel="noopener noreferrer"
                >{{ r.license ?? "Unspecified" }} ↗</a
              >
            </dd>
          </div>
          <div>
            <dt>Artifact format / file set</dt>
            <dd>
              {{ a.format }} / {{ a.files.length }} file{{
                a.files.length === 1 ? "" : "s"
              }}
            </dd>
          </div>
          <div>
            <dt>Actual file bytes</dt>
            <dd>{{ a.sizeBytes.toLocaleString() }}</dd>
          </div>
        </dl>
        <div class="source-actions">
          <a [href]="r.modelCardUrl" target="_blank" rel="noopener noreferrer"
            >Original model card ↗</a
          ><a [href]="a.sourceUrl" target="_blank" rel="noopener noreferrer"
            >Verified artifact repository ↗</a
          >
        </div>
        <details>
          <summary>Provenance & complete file set</summary>
          <div class="provenance">
            <p><strong>Model release</strong><br />{{ r.releaseIdentifier }}</p>
            <p>
              <strong>Model revision</strong><br /><code>{{ r.revision }}</code>
            </p>
            <p><strong>Artifact repository</strong><br />{{ a.repository }}</p>
            <p>
              <strong>Artifact revision</strong><br /><code>{{
                a.revision
              }}</code>
            </p>
            <p>
              Retrieved {{ a.retrievedAt | date: "mediumDate" : "UTC" }} UTC ·
              {{ a.validationStatus }}
            </p>
            @for (f of a.files; track f.path) {
              <a [href]="f.url" target="_blank" rel="noopener noreferrer"
                >{{ f.path }} ↗</a
              >
              <p class="small">
                {{ f.sizeBytes.toLocaleString() }} bytes<br />SHA256:
                <code>{{ f.sha256 }}</code>
              </p>
            }
            @if (r.missingFields.length) {
              <p class="warning">
                Missing fields: {{ r.missingFields.join(", ") }}
              </p>
            }
          </div>
        </details>
        @if (e) {
          <details>
            <summary>Estimator assumptions & architecture</summary>
            <div class="provenance">
              <p>Estimator {{ e.scenario.estimatorVersion }}</p>
              <dl class="facts">
                <div>
                  <dt>Layers / KV heads / head dim</dt>
                  <dd>
                    {{ r.architecture.layers ?? "?" }} /
                    {{ r.architecture.kvHeads ?? "?" }} /
                    {{ r.architecture.headDim ?? "?" }}
                  </dd>
                </div>
              </dl>
              @for (assumption of e.scenario.assumptions; track assumption) {
                <p>{{ assumption }}</p>
              }
              <a
                [href]="r.architecture.sourceUrl"
                target="_blank"
                rel="noopener noreferrer"
                >Architecture metadata source ↗</a
              >
              <p>
                No tokens-per-second prediction. No runtime command is generated
                from an unverified mapping.
              </p>
            </div>
          </details>
        }
      } @else {
        <h2 id="detail-heading">Inspect a candidate</h2>
        <p class="muted">
          Select a point or model release to inspect its exact artifacts, memory
          breakdown and sources.
        </p>
      }
    </aside>
  `,
})
export class DetailComponent {
  readonly s = inject(AtlasStore);
  readonly symbols = STATUS_SYMBOL;
  readonly comparisonRequested = output<void>();
  compare(id: string) {
    const wasCompared = this.s.comparisons().includes(id);
    this.s.toggleCompare(id);
    if (!wasCompared) this.comparisonRequested.emit();
  }
}
