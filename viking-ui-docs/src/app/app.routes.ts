import { Routes } from "@angular/router";
import { DocShell } from "./shell/doc-shell";
import { Landing } from "./pages/landing/landing";

export const routes: Routes = [
  {
    path: "",
    component: DocShell,
    children: [
      {
        path: "",
        component: Landing,
      },
      {
        path: "components",
        loadComponent: () =>
          import("./showcase/showcase").then((m) => m.Showcase),
      },
    ],
  },
  { path: "**", redirectTo: "" },
];
