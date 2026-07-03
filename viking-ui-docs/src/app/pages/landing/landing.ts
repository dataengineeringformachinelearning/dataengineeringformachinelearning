import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterLink } from "@angular/router";
import { Title } from "@angular/platform-browser";
/** Landing page — spartan.ng-style hero before the component browser. */
@Component({
  selector: "app-landing",
  imports: [RouterLink],
  templateUrl: "./landing.html",
  styleUrl: "./landing.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Landing {
  constructor(private readonly title: Title) {
    this.title.setTitle("Viking-UI — Angular Component Library");
  }
}
