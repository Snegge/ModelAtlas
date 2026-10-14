import { bootstrapApplication } from "@angular/platform-browser";
import { provideHttpClient } from "@angular/common/http";
import { provideRouter } from "@angular/router";
import { AppComponent } from "./app/app.component";
import { ExplorerComponent } from "./app/explorer.component";
import { MethodologyComponent } from "./app/methodology.component";
bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(),
    provideRouter([
      { path: "", component: ExplorerComponent },
      { path: "methodology", component: MethodologyComponent },
      { path: "**", redirectTo: "" },
    ]),
  ],
}).catch(console.error);
