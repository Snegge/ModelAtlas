import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { AtlasStore } from "../core/atlas.store";
@Component({
  selector: "atlas-hardware", standalone: true, imports: [FormsModule],
  template: `<aside class="hardware-panel" aria-labelledby="hardware-heading">
    <div class="section-kicker">01 / CONFIGURE</div><h2 id="hardware-heading">Your hardware</h2>
    <p class="muted small">One NVIDIA GPU, llama.cpp CUDA, one request, F16 KV cache.</p>
    @if (s.baseline(); as b) {
      <section class="baseline-strip"><h3>Pinned reference</h3>
        <p>{{ b.gpuGiB }} GiB GPU · {{ b.contextTokens }} tokens · {{ b.bandwidthGBps ?? 'Unknown' }} GB/s</p>
        <button (click)="s.restore()">Restore baseline</button><button (click)="s.clearBaseline()">Clear baseline</button>
      </section>
    }
    <div class="control-block"><label for="gpu-exact">NVIDIA GPU memory budget · GiB</label>
      <input id="gpu-exact" type="number" min="0" max="192" [ngModel]="s.hardware().gpuGiB" (ngModelChange)="s.setHardware({gpuGiB:$event})" />
    </div>
    <div class="control-block"><label for="bandwidth-exact">GPU memory bandwidth · GB/s</label>
      <input id="bandwidth-exact" type="number" min="1" max="10000" [ngModel]="s.hardware().bandwidthGBps" (ngModelChange)="s.setHardware({bandwidthGBps:$event})" />
    </div>
    <div class="control-block"><label for="context-exact">Requested context tokens</label>
      <input id="context-exact" type="number" min="256" max="1048576" [ngModel]="s.hardware().contextTokens" (ngModelChange)="s.setHardware({contextTokens:$event})" />
    </div>
    <div class="control-block"><label for="minimum-exact">Minimum generation speed · tokens/s</label>
      <input id="minimum-exact" type="number" min="0" max="1000" [ngModel]="s.hardware().minimumTokensPerSecond" (ngModelChange)="s.setHardware({minimumTokensPerSecond:$event})" />
    </div>
    <p class="control-help">All variants are checked. Recommendations use full GPU fit and the conservative speed estimate.</p>
    @if (!s.baseline()) { <button class="button primary full" (click)="s.pin()" [disabled]="!s.current()">Pin as baseline</button> }
    <button class="button subtle full" (click)="s.reset()">Reset exploration to defaults</button>
    @if (!s.storageAvailable()) { <p class="warning small">Browser storage is unavailable. This session will not persist.</p> }
  </aside>`,
})
export class HardwareComponent { readonly s = inject(AtlasStore); }
