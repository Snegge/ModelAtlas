import { bootstrapApplication } from "@angular/platform-browser";
import { provideHttpClient } from "@angular/common/http";
import { provideRouter, withInMemoryScrolling } from "@angular/router";
import { AppComponent } from "./app/app.component";
import { DiscoverComponent } from "./app/discover.component";
import { WorkspaceComponent } from "./app/workspace/workspace.component";
import { MethodologyComponent } from "./app/methodology.component";
bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(),
    provideRouter(
      [
        { path: "", component: WorkspaceComponent },
        { path: "discover", component: DiscoverComponent },
        { path: "models/:id", component: WorkspaceComponent },
        { path: "methodology", component: MethodologyComponent },
        { path: "**", redirectTo: "" },
      ],
      withInMemoryScrolling({ anchorScrolling: "enabled" }),
    ),
  ],
}).catch(console.error);
