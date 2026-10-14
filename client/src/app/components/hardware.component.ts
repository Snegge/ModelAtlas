import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CdkAccordionModule } from "@angular/cdk/accordion";
import { AtlasStore } from "../core/atlas.store";
@Component({
  selector: "atlas-hardware",
  standalone: true,
  imports: [FormsModule, CdkAccordionModule],
  template: `
    <aside class="hardware-panel" aria-labelledby="hardware-heading">
      <div class="section-kicker">01 / CONFIGURE</div>
      <h2 id="hardware-heading">Your hardware</h2>
      <p class="muted small">Adjust a budget. Watch the boundary move.</p>
      @if (s.baseline(); as b) {
        <section class="baseline-strip" aria-labelledby="baseline-heading">
          <div class="baseline-top">
            <div>
              <div class="section-kicker" id="baseline-heading">
                PINNED REFERENCE
              </div>
              <div class="baseline-values">
                <b>{{ b.gpuGiB }} GiB GPU</b
                ><span>· {{ b.ramGiB }} GiB RAM</span
                ><span>· {{ b.contextTokens.toLocaleString() }} tokens</span
                ><span>· {{ b.quantization }}</span
                ><span
                  >· {{ b.cachePrecision.toUpperCase() }} ×
                  {{ b.concurrency }}</span
                ><span>· Offload {{ b.allowOffload ? "on" : "off" }}</span>
              </div>
            </div>
            <div class="baseline-actions">
              <button class="button small-button" (click)="s.restore()">
                Restore baseline</button
              ><button class="text-button" (click)="s.clearBaseline()">
                Clear baseline
              </button>
            </div>
          </div>
          <details class="baseline-changes">
            <summary>Scenario changes</summary>
            <div class="scenario-outcomes" [attr.aria-busy]="!s.current()">
              <span
                ><b class="gained">+{{ s.changes().gained }}</b> become
                feasible</span
              ><span
                ><b class="lost">−{{ s.changes().lost }}</b> become
                infeasible</span
              ><span
                ><b>{{ s.changes().uncertain }}</b> remain uncertain</span
              ><span
                ><b>{{ s.changes().switched }}</b> representative changes</span
              >
            </div>
            <p class="tiny muted">
              The baseline stays fixed as you adjust the live settings. Across
              the full catalog, feasible means estimated GPU fit or possible
              weight offloading within the documented context. Exact artifacts
              are paired in details and comparison.
            </p>
          </details>
        </section>
      }

      <div class="control-block">
        <div class="control-title">
          <label for="gpu">GPU memory budget</label
          ><span class="unit-value"
            >{{ s.hardware().gpuGiB }} <small>GiB</small></span
          >
        </div>
        <input
          id="gpu"
          type="range"
          min="0"
          max="192"
          step="1"
          [ngModel]="s.hardware().gpuGiB"
          (ngModelChange)="s.setHardware({ gpuGiB: $event })"
          aria-label="GPU memory budget slider in GiB"
        />
        <div class="range-labels">
          <span>0</span
          ><label for="gpu-exact" class="sr-only"
            >Exact GPU budget in GiB, 0 to 192</label
          ><input
            id="gpu-exact"
            type="number"
            min="0"
            max="192"
            step="1"
            [ngModel]="s.hardware().gpuGiB"
            (ngModelChange)="s.setHardware({ gpuGiB: $event })"
          /><span>192 GiB</span>
        </div>
        <p class="control-help">
          Available dedicated VRAM, after other workloads.
        </p>
      </div>
      <div class="control-block">
        <div class="control-title">
          <label for="ram">System memory budget</label
          ><span class="unit-value"
            >{{ s.hardware().ramGiB }} <small>GiB</small></span
          >
        </div>
        <input
          id="ram"
          type="range"
          min="1"
          max="128"
          [ngModel]="s.hardware().ramGiB"
          (ngModelChange)="s.setHardware({ ramGiB: $event })"
          aria-label="System memory budget slider in GiB"
        />
        <div class="range-labels">
          <span>1</span
          ><label for="ram-exact" class="sr-only"
            >Exact system memory in GiB, 1 to 1024</label
          ><input
            id="ram-exact"
            type="number"
            min="1"
            max="1024"
            [ngModel]="s.hardware().ramGiB"
            (ngModelChange)="s.setHardware({ ramGiB: $event })"
          /><span>128 GiB</span>
        </div>
      </div>
      <div class="control-block">
        <div class="control-title">
          <label for="context">Requested context</label
          ><span class="unit-value"
            >{{ s.hardware().contextTokens.toLocaleString() }}
            <small>tokens</small></span
          >
        </div>
        <input
          id="context"
          type="range"
          min="8"
          max="20"
          step="1"
          [ngModel]="contextExponent()"
          (ngModelChange)="context($event)"
          [attr.aria-valuetext]="s.hardware().contextTokens + ' tokens'"
          aria-label="Requested context length slider"
        />
        <div class="range-labels">
          <span>256</span
          ><label for="context-exact" class="sr-only"
            >Exact requested context tokens</label
          ><input
            id="context-exact"
            type="number"
            min="256"
            max="1048576"
            step="256"
            [ngModel]="s.hardware().contextTokens"
            (ngModelChange)="s.setHardware({ contextTokens: $event })"
          /><span>1M tokens</span>
        </div>
        <p class="control-help">
          Prompt + output per sequence. Larger context uses more cache.
        </p>
      </div>
      <div class="control-block">
        <label for="quant-preference">Preferred artifact quantization</label
        ><select
          id="quant-preference"
          [ngModel]="s.hardware().quantization"
          (ngModelChange)="s.setHardware({ quantization: $event })"
        >
          <option value="Q4_K_M">Q4_K_M · compact</option>
          <option value="Q5_K_M">Q5_K_M · balanced</option>
          <option value="Q8_0">Q8_0 · larger weights</option>
          <option value="smallest">Smallest available artifact</option>
        </select>
        <p class="control-help">
          One representative per release. If unavailable, the smallest verified
          artifact is used and labelled.
        </p>
      </div>
      <label class="check-label"
        ><input
          type="checkbox"
          [ngModel]="s.hardware().allowOffload"
          (ngModelChange)="s.setHardware({ allowOffload: $event })"
        />Allow partial CPU/RAM offloading</label
      >
      <cdk-accordion
        ><cdk-accordion-item #advanced="cdkAccordionItem"
          ><button
            class="disclosure"
            (click)="advanced.toggle()"
            [attr.aria-expanded]="advanced.expanded"
            aria-controls="advanced-settings"
          >
            Advanced inference settings
            <span>{{ advanced.expanded ? "−" : "+" }}</span>
          </button>
          @if (advanced.expanded) {
            <div id="advanced-settings" class="advanced-fields">
              <label for="cache">KV-cache precision</label
              ><select
                id="cache"
                [ngModel]="s.hardware().cachePrecision"
                (ngModelChange)="s.setHardware({ cachePrecision: $event })"
              >
                <option value="f16">FP16 · 2 bytes/value</option>
                <option value="f32">FP32 · 4 bytes/value</option></select
              ><label for="concurrency">Concurrent sequences</label
              ><input
                id="concurrency"
                type="number"
                min="1"
                max="8"
                [ngModel]="s.hardware().concurrency"
                (ngModelChange)="s.setHardware({ concurrency: $event })"
              />
              <p class="control-help">
                A single dedicated GPU. Unified memory and CPU-only execution
                are outside this estimator.
              </p>
            </div>
          }
        </cdk-accordion-item></cdk-accordion
      >
      @if (!s.baseline()) {
        <button
          class="button primary full"
          (click)="s.pin()"
          [disabled]="!s.current()"
          aria-describedby="baseline-help"
        >
          Pin as baseline <span>⌖</span>
        </button>
        <p id="baseline-help" class="control-help baseline-help">
          Save these settings as a fixed reference for your next changes.
        </p>
      } @else {
        <p class="control-help baseline-help">
          Baseline pinned. Clear it to choose a new reference.
        </p>
      }
      <button class="button subtle full" (click)="s.reset()">
        Reset exploration to defaults
      </button>
      @if (!s.storageAvailable()) {
        <p class="warning small">
          Browser storage is unavailable. This session will not persist.
        </p>
      }
      <div class="hardware-note">
        <span class="mini-icon">i</span>
        <p>
          Budgets are estimates. A memory fit does not verify architecture or
          runtime support.
        </p>
      </div>
    </aside>
  `,
})
export class HardwareComponent {
  readonly s = inject(AtlasStore);
  contextExponent() {
    return Math.log2(this.s.hardware().contextTokens);
  }
  context(v: number) {
    this.s.setHardware({ contextTokens: 2 ** v });
  }
}
