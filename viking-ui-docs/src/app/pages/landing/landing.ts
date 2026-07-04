import { ChangeDetectionStrategy, Component } from "@angular/core";
import { Router } from "@angular/router";
import { Title } from "@angular/platform-browser";
import {
  VikingButton,
  VikingCard,
  VikingHeading,
  VikingPageHeader,
  VikingText,
} from "@dataengineeringformachinelearning/viking-ui";

/** Landing page — Viking-UI hero using library shell primitives. */
@Component({
  selector: "app-landing",
  imports: [
    VikingPageHeader,
    VikingButton,
    VikingHeading,
    VikingText,
    VikingCard,
  ],
  templateUrl: "./landing.html",
  styleUrl: "./landing.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Landing {
  constructor(
    private readonly router: Router,
    private readonly title: Title,
  ) {
    this.title.setTitle("Viking-UI — Angular Component Library");
  }

  protected goComponents = (): void => {
    void this.router.navigate(["/components"]);
  };
}
