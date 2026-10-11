import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CdkAccordionModule } from "@angular/cdk/accordion";
import { AtlasStore } from "../core/atlas.store";
import { DEFAULTS } from "../core/models";
@Component({
  selector: "atlas-hardware",
  standalone: true,
  imports: [FormsModule, CdkAccordionModule],
  template: `
    <aside class="hardware-panel" aria-labelledby="hardware-heading">
      <div class="section-kicker">01 / CONFIGURE</div>
      <h2 id="hardware-heading">Your hardware</h2>
      <p class="muted small">Adjust a budget. Watch the boundary move.</p>
      <label for="preset">Hardware preset</label
      ><select
        id="preset"
        [ngModel]="preset()"
        (ngModelChange)="setPreset($event)"
      >
        <option value="custom">Custom configuration</option>
        <option value="compact">Compact · 6 GiB GPU / 16 GiB RAM</option>
        <option value="studio">Studio · 12 GiB GPU / 32 GiB RAM</option>
        <option value="workstation">
          Workstation · 24 GiB GPU / 64 GiB RAM
        </option>
      </select>
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
      <button
        class="button primary full"
        (click)="s.pin()"
        [disabled]="!s.current()"
      >
        {{ s.baseline() ? "Replace pinned baseline" : "Pin as baseline" }}
        <span>⌖</span>
      </button>
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
  preset() {
    const h = this.s.hardware();
    return h.gpuGiB === 6 && h.ramGiB === 16
      ? "compact"
      : h.gpuGiB === 12 && h.ramGiB === 32
        ? "studio"
        : h.gpuGiB === 24 && h.ramGiB === 64
          ? "workstation"
          : "custom";
  }
  setPreset(p: string) {
    const v: Record<string, number[]> = {
      compact: [6, 16],
      studio: [12, 32],
      workstation: [24, 64],
    };
    if (v[p]) this.s.setHardware({ gpuGiB: v[p][0], ramGiB: v[p][1] });
  }
}
