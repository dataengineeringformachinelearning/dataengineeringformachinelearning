import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { ToastOutlet } from "./toast-outlet";

@Component({
  selector: "app-root",
  imports: [RouterOutlet, ToastOutlet],
  template: `
    <router-outlet />
    <app-toast-outlet />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
