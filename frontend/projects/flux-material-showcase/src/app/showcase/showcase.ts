import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import {
  FluxAccordion,
  FluxAccordionItem,
  FluxAutocomplete,
  FluxAvatar,
  FluxBadge,
  FluxBrand,
  FluxBreadcrumb,
  FluxBreadcrumbs,
  FluxButton,
  FluxButtonGroup,
  FluxCalendar,
  FluxCallout,
  FluxCard,
  FluxCardFooter,
  FluxCardHeader,
  FluxCarousel,
  FluxCarouselSlide,
  FluxChart,
  FluxChartSeries,
  FluxCheckbox,
  FluxColorPicker,
  FluxCommand,
  FluxCommandItem,
  FluxComposer,
  FluxContext,
  FluxDatePicker,
  FluxDropdown,
  FluxEditor,
  FluxField,
  FluxFileUpload,
  FluxHeading,
  FluxIcon,
  FluxInput,
  FluxKanban,
  FluxKanbanColumn,
  FluxMenuItem,
  FluxModal,
  FluxNavbar,
  FluxNavbarItem,
  FluxOtpInput,
  FluxPagination,
  FluxPillbox,
  FluxPopover,
  FluxProfile,
  FluxProgress,
  FluxRadioGroup,
  FluxSelect,
  FluxSelectOption,
  FluxSeparator,
  FluxSkeleton,
  FluxSlider,
  FluxSwitch,
  FluxText,
  FluxTextarea,
  FluxTimePicker,
  FluxTimeline,
  FluxTimelineItem,
  FluxToastService,
  FluxTooltip,
} from '@deml/flux-material';

/**
 * Living gallery for the @deml/flux-material UI kit: every free Flux UI
 * component (https://fluxui.dev), themed with DEML Material tokens.
 */
@Component({
  selector: 'app-showcase',
  imports: [
    FluxAccordion,
    FluxAccordionItem,
    FluxAutocomplete,
    FluxAvatar,
    FluxBadge,
    FluxBrand,
    FluxBreadcrumbs,
    FluxButton,
    FluxButtonGroup,
    FluxCalendar,
    FluxCallout,
    FluxCard,
    FluxCardFooter,
    FluxCardHeader,
    FluxCarousel,
    FluxCarouselSlide,
    FluxChart,
    FluxCheckbox,
    FluxColorPicker,
    FluxCommand,
    FluxComposer,
    FluxContext,
    FluxDatePicker,
    FluxDropdown,
    FluxEditor,
    FluxField,
    FluxFileUpload,
    FluxHeading,
    FluxIcon,
    FluxInput,
    FluxKanban,
    FluxMenuItem,
    FluxModal,
    FluxNavbar,
    FluxNavbarItem,
    FluxOtpInput,
    FluxPagination,
    FluxPillbox,
    FluxPopover,
    FluxProfile,
    FluxProgress,
    FluxRadioGroup,
    FluxSelect,
    FluxSeparator,
    FluxSkeleton,
    FluxSlider,
    FluxSwitch,
    FluxText,
    FluxTextarea,
    FluxTimePicker,
    FluxTimeline,
    FluxTimelineItem,
    FluxTooltip,
  ],
  templateUrl: './showcase.html',
  styleUrl: './showcase.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Showcase {
  private readonly toastService = inject(FluxToastService);

  protected readonly modalOpen = signal(false);
  protected readonly commandOpen = signal(false);
  protected readonly lastMessage = signal('');

  protected readonly breadcrumbs: FluxBreadcrumb[] = [
    { label: '@deml/flux-material', href: '/' },
    { label: 'Component Gallery' },
  ];

  protected readonly regionOptions: FluxSelectOption[] = [
    { label: 'us-central1 (Iowa)', value: 'us-central1' },
    { label: 'us-east1 (South Carolina)', value: 'us-east1' },
    { label: 'europe-west1 (Belgium)', value: 'europe-west1' },
    { label: 'asia-northeast1 (Tokyo)', value: 'asia-northeast1', disabled: true },
  ];

  protected readonly retentionOptions: FluxSelectOption[] = [
    { label: '30 days', value: 30 },
    { label: '60 days', value: 60 },
    { label: '90 days', value: 90 },
  ];

  protected readonly pipelineSuggestions: string[] = [
    'telemetry_worker',
    'outbox_relay',
    'sla_trainer',
    'threat_scanner',
    'kms_rotation',
    'snapshot_compactor',
  ];

  protected readonly commandItems: FluxCommandItem[] = [
    { id: 'dashboard', label: 'Open dashboard', group: 'Navigate', icon: 'home', kbd: 'G D' },
    { id: 'status', label: 'Open status page', group: 'Navigate', icon: 'bar-chart' },
    { id: 'retrain', label: 'Trigger SLA model training', group: 'Actions', icon: 'sparkle' },
    { id: 'rotate', label: 'Rotate encryption keys', group: 'Actions', icon: 'lock' },
  ];

  protected readonly chartSeries: FluxChartSeries[] = [
    { name: 'p50 latency', tone: 'accent', data: [42, 38, 45, 40, 36, 39, 34, 31, 35, 30, 28, 27] },
    {
      name: 'p95 latency',
      tone: 'warning',
      data: [90, 84, 96, 88, 80, 85, 74, 70, 78, 66, 61, 58],
    },
  ];

  protected readonly kanbanColumns = signal<FluxKanbanColumn[]>([
    {
      id: 'todo',
      title: 'Backlog',
      cards: [
        { id: 'k1', title: 'PQC key exchange spike', description: 'Lattice-based prototype' },
        { id: 'k2', title: 'DLQ replay tooling' },
      ],
    },
    {
      id: 'doing',
      title: 'In progress',
      cards: [{ id: 'k3', title: 'Outbox relay metrics', description: 'OTEL span coverage' }],
    },
    { id: 'done', title: 'Done', cards: [{ id: 'k4', title: 'Firestore projections v2' }] },
  ]);

  constructor() {
    inject(Title).setTitle('Flux-Material Component Gallery');
  }

  protected showToast = (tone: 'success' | 'danger'): void => {
    if (tone === 'success') {
      this.toastService.show({
        heading: 'Projection materialized',
        text: 'users/{uid}/data/stats synced to Firestore.',
        tone: 'success',
      });
    } else {
      this.toastService.show({
        heading: 'Consumer lag detected',
        text: 'frontend-events partition 3 fell behind by 12s.',
        tone: 'danger',
      });
    }
  };

  protected onMessage = (message: string): void => {
    this.lastMessage.set(message);
    this.toastService.show({ heading: 'Message sent', text: message, tone: 'accent' });
  };
}
