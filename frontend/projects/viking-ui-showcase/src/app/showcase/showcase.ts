import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import {
  VikingAccordion,
  VikingAccordionItem,
  VikingAuthPanel,
  VikingAutocomplete,
  VikingAvatar,
  VikingBadge,
  VikingBrand,
  VikingBreadcrumb,
  VikingBreadcrumbs,
  VikingButton,
  VikingButtonGroup,
  VikingCalendar,
  VikingCallout,
  VikingCard,
  VikingCardFooter,
  VikingCardHeader,
  VikingCarousel,
  VikingCarouselSlide,
  VikingChart,
  VikingChartSeries,
  VikingCheckbox,
  VikingColorPicker,
  VikingCommand,
  VikingCommandItem,
  VikingComposer,
  VikingContext,
  VikingDatePicker,
  VikingDropdown,
  VikingEditor,
  VikingField,
  VikingFileUpload,
  VikingHeading,
  VikingIcon,
  VikingInput,
  VikingKanban,
  VikingKanbanColumn,
  VikingKbd,
  VikingLabel,
  VikingMenuItem,
  VikingMenubar,
  VikingMenubarItem,
  VikingModal,
  VikingNativeSelect,
  VikingNavigationMenu,
  VikingNavbar,
  VikingNavbarItem,
  VikingOtpInput,
  VikingPagination,
  VikingPillbox,
  VikingPopover,
  VikingProfile,
  VikingProgress,
  VikingRadioGroup,
  VikingScrollArea,
  VikingSelect,
  VikingSelectOption,
  VikingSeparator,
  VikingSheet,
  VikingSiteFooter,
  VikingSiteNavbar,
  VikingSkeleton,
  VikingSlider,
  VikingSpinner,
  VikingSwitch,
  VikingTab,
  VikingTabPanel,
  VikingTable,
  VikingTabs,
  VikingText,
  VikingToggle,
  VikingToggleGroup,
  VikingTextarea,
  VikingTimePicker,
  VikingTimeline,
  VikingTimelineItem,
  VikingToastService,
  VikingTooltip,
} from '@dataengineeringformachinelearning/viking-ui';

/**
 * Living gallery for the @dataengineeringformachinelearning/viking-ui UI kit, themed with DEML tokens.
 */
@Component({
  selector: 'app-showcase',
  imports: [
    VikingAccordion,
    VikingAccordionItem,
    VikingAuthPanel,
    VikingAutocomplete,
    VikingAvatar,
    VikingBadge,
    VikingBrand,
    VikingBreadcrumbs,
    VikingButton,
    VikingButtonGroup,
    VikingCalendar,
    VikingCallout,
    VikingCard,
    VikingCardFooter,
    VikingCardHeader,
    VikingCarousel,
    VikingCarouselSlide,
    VikingChart,
    VikingCheckbox,
    VikingColorPicker,
    VikingCommand,
    VikingComposer,
    VikingContext,
    VikingDatePicker,
    VikingDropdown,
    VikingEditor,
    VikingField,
    VikingFileUpload,
    VikingHeading,
    VikingIcon,
    VikingInput,
    VikingKanban,
    VikingKbd,
    VikingLabel,
    VikingMenuItem,
    VikingMenubar,
    VikingMenubarItem,
    VikingModal,
    VikingNativeSelect,
    VikingNavigationMenu,
    VikingNavbar,
    VikingNavbarItem,
    VikingOtpInput,
    VikingPagination,
    VikingPillbox,
    VikingPopover,
    VikingProfile,
    VikingProgress,
    VikingRadioGroup,
    VikingScrollArea,
    VikingSelect,
    VikingSeparator,
    VikingSheet,
    VikingSiteFooter,
    VikingSiteNavbar,
    VikingSkeleton,
    VikingSlider,
    VikingSpinner,
    VikingSwitch,
    VikingTab,
    VikingTabPanel,
    VikingTable,
    VikingTabs,
    VikingText,
    VikingTextarea,
    VikingTimePicker,
    VikingTimeline,
    VikingTimelineItem,
    VikingToggle,
    VikingToggleGroup,
    VikingTooltip,
  ],
  templateUrl: './showcase.html',
  styleUrl: './showcase.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Showcase {
  private readonly toastService = inject(VikingToastService);

  protected readonly modalOpen = signal(false);
  protected readonly sheetOpen = signal(false);
  protected readonly activeTab = signal('overview');
  protected readonly viewToggle = signal('grid');
  protected readonly commandOpen = signal(false);
  protected readonly lastMessage = signal('');

  protected readonly navItems = [
    { label: 'Gallery', href: '/', active: true },
    { label: 'Docs', href: '/documentation' },
    { label: 'Status', href: '/status' },
  ];

  protected readonly breadcrumbs: VikingBreadcrumb[] = [
    { label: '@dataengineeringformachinelearning/viking-ui', href: '/' },
    { label: 'Component Gallery' },
  ];

  protected readonly regionOptions: VikingSelectOption[] = [
    { label: 'us-central1 (Iowa)', value: 'us-central1' },
    { label: 'us-east1 (South Carolina)', value: 'us-east1' },
    { label: 'europe-west1 (Belgium)', value: 'europe-west1' },
    { label: 'asia-northeast1 (Tokyo)', value: 'asia-northeast1', disabled: true },
  ];

  protected readonly retentionOptions: VikingSelectOption[] = [
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

  protected readonly commandItems: VikingCommandItem[] = [
    { id: 'dashboard', label: 'Open dashboard', group: 'Navigate', icon: 'home', kbd: 'G D' },
    { id: 'status', label: 'Open status page', group: 'Navigate', icon: 'bar-chart' },
    { id: 'retrain', label: 'Trigger SLA model training', group: 'Actions', icon: 'sparkle' },
    { id: 'rotate', label: 'Rotate encryption keys', group: 'Actions', icon: 'lock' },
  ];

  protected readonly memoryCategories = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  protected readonly memorySeries: VikingChartSeries[] = [
    { name: 'Memory', tone: 'accent', data: [192, 210, 198, 256, 288, 312, 296] },
  ];

  protected readonly stockCategories = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  protected readonly stockSeries: VikingChartSeries[] = [
    { name: 'Stock', tone: 'accent', data: [142, 156, 149, 168, 175, 182] },
  ];

  protected readonly socialCategories = ['Q1', 'Q2', 'Q3', 'Q4'];
  protected readonly socialSeries: VikingChartSeries[] = [
    { name: 'Instagram', tone: 'success', data: [0.42, 0.48, 0.51, 0.55] },
    { name: 'Twitter', tone: 'accent', data: [0.31, 0.34, 0.36, 0.38] },
    { name: 'Facebook', tone: 'danger', data: [0.22, 0.24, 0.21, 0.19] },
  ];

  protected readonly revenueCategories = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'];
  protected readonly revenueSeries: VikingChartSeries[] = [
    { name: 'Revenue', tone: 'accent', data: [4200, 5100, 4800, 6200, 5900, 7100] },
  ];

  protected readonly browserCategories = ['2022', '2023', '2024', '2025'];
  protected readonly browserSeries: VikingChartSeries[] = [
    { name: 'Chrome', tone: 'accent', data: [62, 64, 66, 67] },
    { name: 'Firefox', tone: 'success', data: [11, 10, 9, 8] },
    { name: 'Safari', tone: 'warning', data: [18, 19, 20, 21] },
  ];

  protected readonly orderCategories = ['North', 'South', 'East', 'West'];
  protected readonly orderSeries: VikingChartSeries[] = [
    { name: 'Online', tone: 'accent', data: [120, 98, 140, 110] },
    { name: 'Retail', tone: 'success', data: [80, 72, 90, 84] },
    { name: 'Wholesale', tone: 'warning', data: [40, 36, 48, 42] },
  ];

  protected readonly sparklineSeries: VikingChartSeries[] = [
    { name: 'Trend', tone: 'success', data: [15, 18, 16, 19, 22, 25, 28, 25, 29, 28, 32, 35] },
  ];

  protected readonly statSparklineSeries: VikingChartSeries[] = [
    { name: 'Revenue', tone: 'accent', data: [10, 12, 11, 13, 15, 14, 16, 18, 17, 19, 21, 20] },
  ];

  protected readonly donutSegments = [
    { label: 'Critical', value: 12, tone: 'danger' as const },
    { label: 'High', value: 28, tone: 'warning' as const },
    { label: 'Medium', value: 44, tone: 'accent' as const },
    { label: 'Low', value: 16, tone: 'success' as const },
  ];

  protected readonly sparklineRows = [
    { symbol: 'AAPL', price: '$193.45', change: '+2.4%', tone: 'success' as const },
    { symbol: 'MSFT', price: '$338.12', change: '+1.8%', tone: 'success' as const },
    { symbol: 'TSLA', price: '$242.68', change: '-3.2%', tone: 'danger' as const },
    { symbol: 'GOOGL', price: '$129.87', change: '+0.9%', tone: 'success' as const },
  ];

  protected readonly kanbanColumns = signal<VikingKanbanColumn[]>([
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
    inject(Title).setTitle('Viking-Material Component Gallery');
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
