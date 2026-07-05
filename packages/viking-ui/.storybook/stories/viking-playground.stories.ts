import type { Meta, StoryObj } from "@storybook/html";

const renderPlayground = ({
  panelTitle,
  cardCompact,
  cardInteractive,
  commandLabel,
  commandVariant,
  inputLabel,
  inputType,
  inputValue,
  selectLabel,
  selectValue,
  helperText,
  tone,
  showCallout,
}: {
  panelTitle: string;
  cardCompact: boolean;
  cardInteractive: boolean;
  commandLabel: string;
  commandVariant: string;
  inputLabel: string;
  inputType: string;
  inputValue: string;
  selectLabel: string;
  selectValue: string;
  helperText: string;
  tone: string;
  showCallout: boolean;
}) => `
  <div class="landing-playground-band">
    <div class="landing-playground-copy">
      <span class="viking-story-playground-title">Viking UI Playground</span>
      <h3 class="viking-heading-sm">DEML premium command shell</h3>
      <p class="viking-text-muted">
        Tune core components in one place with strict tokens, generous precision spacing, and production-safe
        interaction states.
      </p>
      <div class="viking-story-row">
        <viking-badge tone="${tone}" icon="shield">Signal ready</viking-badge>
        <viking-badge tone="muted" icon="check">Pragmatic defaults</viking-badge>
        <viking-theme-toggle-wc aria-label="Theme"></viking-theme-toggle-wc>
      </div>
      <p class="viking-text-muted">Use controls to test typography contrast, hierarchy, and button/card states.</p>
    </div>
    <div class="landing-playground-preview">
      <viking-card title="${panelTitle}" ${cardCompact ? "compact" : ""} ${
        cardInteractive ? "interactive" : ""
      }>
        <div class="viking-card-header">
          <h3 class="viking-heading-sm">${panelTitle}</h3>
        </div>
        <viking-field label="${inputLabel}">
          <viking-input
            type="${inputType}"
            value="${inputValue}"
            clearable
            required
          ></viking-input>
        </viking-field>
        <viking-select
          label="${selectLabel}"
          value="${selectValue}"
          required
          width="full"
        >
          <option value="7d">7 days</option>
          <option value="30d">30 days</option>
          <option value="90d">90 days</option>
          <option value="180d">180 days</option>
        </viking-select>
        <p class="viking-text-muted">${helperText}</p>
        ${
          showCallout
            ? `<viking-callout tone="${tone}" heading="Operational state" dismissible>
            Deployment telemetry is in lockstep; controls above are aligned to the 8px rhythm and
            machined card/button tokens.
          </viking-callout>`
            : ""
        }
        <div class="viking-card-footer">
          <viking-button
            size="sm"
            variant="${commandVariant}"
          >${commandLabel}</viking-button>
          <viking-button size="sm" variant="ghost">Inspect</viking-button>
        </div>
      </viking-card>
    </div>
  </div>
`;

const meta: Meta<typeof renderPlayground> = {
  title: "Viking Web Components/Playground/Command Grid",
  tags: ["autodocs"],
  render: renderPlayground,
  argTypes: {
    panelTitle: { control: "text" },
    cardCompact: { control: "boolean" },
    cardInteractive: { control: "boolean" },
    commandLabel: { control: "text" },
    commandVariant: {
      control: "select",
      options: [
        "outline",
        "primary",
        "secondary",
        "filled",
        "danger",
        "ghost",
        "subtle",
      ],
    },
    inputLabel: { control: "text" },
    inputType: {
      control: "select",
      options: ["text", "email", "password", "search", "number"],
    },
    inputValue: { control: "text" },
    selectLabel: { control: "text" },
    selectValue: {
      control: "select",
      options: ["7d", "30d", "90d", "180d"],
    },
    helperText: { control: "text" },
    tone: {
      control: "select",
      options: [
        "accent",
        "success",
        "warning",
        "danger",
        "info",
        "secondary",
        "muted",
        "subtle",
      ],
    },
    showCallout: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof renderPlayground>;

export const Battlefield: Story = {
  args: {
    panelTitle: "Operations cockpit",
    cardCompact: false,
    cardInteractive: true,
    commandLabel: "Deploy scanner mesh",
    commandVariant: "primary",
    inputLabel: "Operation code",
    inputType: "text",
    inputValue: "ops-node-44",
    selectLabel: "Retention window",
    selectValue: "30d",
    helperText:
      "Use this panel to validate cross-component rhythm and spacing in real UI scenarios.",
    tone: "accent",
    showCallout: true,
  },
};
