import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Title, Meta } from '@angular/platform-browser';
import { Router, RouterModule } from '@angular/router';
import {
  VikingButton,
  VikingCallout,
  VikingCard,
  VikingCardHeader,
  VikingCardTitle,
  VikingCheckbox,
  VikingField,
  VikingFormGrid,
  VikingFormSection,
  VikingInput,
  VikingPageHeader,
  VikingPageSkeleton,
  VikingPageTemplate,
  VikingPipelineFlow,
  VikingSectionTemplate,
  VikingStack,
  VikingTextarea,
} from '@dataengineeringformachinelearning/viking-ui';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import {
  UnifiedSelect,
  type SelectOption,
} from '../../components/unified-select/unified-select.component';
import {
  composeWorkflowYaml,
  draftFromCatalog,
  draftPipelineCards,
  draftReadyToExport,
  validateWorkflowDraft,
  type WorkflowCatalogRow,
  type WorkflowDraft,
  workflowYamlFilename,
} from '../../core/workflow-yaml';

type WorkflowListResponse = {
  ok?: boolean;
  count?: number;
  workflows?: WorkflowCatalogRow[];
  degraded?: boolean;
};

@Component({
  selector: 'app-pipeline',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    UnifiedSelect,
    VikingButton,
    VikingCallout,
    VikingCard,
    VikingCardHeader,
    VikingCardTitle,
    VikingCheckbox,
    VikingField,
    VikingFormGrid,
    VikingFormSection,
    VikingInput,
    VikingPageHeader,
    VikingPageSkeleton,
    VikingPageTemplate,
    VikingPipelineFlow,
    VikingSectionTemplate,
    VikingStack,
    VikingTextarea,
  ],
  templateUrl: './pipeline.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pipeline implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  readonly workflows = signal<WorkflowCatalogRow[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly degraded = signal(false);
  readonly selectedId = signal<string | null>(null);
  readonly draft = signal<WorkflowDraft>(draftFromCatalog(null));
  readonly copied = signal(false);
  readonly yamlTouched = signal(false);

  readonly selected = computed(
    () => this.workflows().find(w => w.id === this.selectedId()) ?? null,
  );

  readonly catalogOptions = computed<SelectOption[]>(() =>
    this.workflows().map(w => ({
      value: w.id,
      label: w.default ? `${w.name} (default)` : w.name,
    })),
  );

  readonly previewSteps = computed(() => draftPipelineCards(this.draft()));
  readonly yamlPreview = computed(() => composeWorkflowYaml(this.draft()));
  readonly yamlFilename = computed(() => workflowYamlFilename(this.draft()));
  readonly validationIssues = computed(() => validateWorkflowDraft(this.draft()));
  readonly exportReady = computed(() => draftReadyToExport(this.draft()));
  readonly validationErrors = computed(() =>
    this.validationIssues().filter(i => i.level === 'error'),
  );
  readonly validationWarnings = computed(() =>
    this.validationIssues().filter(i => i.level === 'warning'),
  );

  constructor() {
    effect(() => {
      if (this.auth.isInitialized() && !this.auth.isAuthenticated()) {
        void this.router.navigate(['/login']);
      }
    });
  }

  ngOnInit(): void {
    this.title.setTitle('Pipeline - DEML');
    this.meta.updateTag({
      name: 'description',
      content:
        'Configure sealed-stream workflows visually and export FORJD YAML. YAML remains the source of truth.',
    });
    if (this.auth.isAuthenticated()) {
      this.loadWorkflows();
    }
  }

  loadWorkflows(): void {
    this.loading.set(true);
    this.error.set(null);
    this.http.get<WorkflowListResponse>(`${environment.backendUrl}/api/v1/workflows`).subscribe({
      next: res => {
        const rows = Array.isArray(res.workflows) ? res.workflows : [];
        this.workflows.set(rows);
        this.degraded.set(Boolean(res.degraded));
        const preferred =
          rows.find(w => w.id === 'threat_telemetry') ??
          rows.find(w => w.default) ??
          rows[0] ??
          null;
        if (preferred) {
          this.selectWorkflow(preferred.id);
        } else {
          this.selectedId.set(null);
          this.draft.set(draftFromCatalog(null));
        }
        this.loading.set(false);
      },
      error: () => {
        this.workflows.set([]);
        this.degraded.set(false);
        this.error.set('Could not load the workflow catalog. Try again shortly.');
        this.loading.set(false);
      },
    });
  }

  selectWorkflow(id: string): void {
    this.selectedId.set(id);
    const row = this.workflows().find(w => w.id === id) ?? null;
    this.draft.set(draftFromCatalog(row));
    this.yamlTouched.set(false);
    this.copied.set(false);
  }

  startBlank(): void {
    this.selectedId.set(null);
    this.draft.set(draftFromCatalog(null));
    this.yamlTouched.set(false);
    this.copied.set(false);
  }

  patchDraft(patch: Partial<WorkflowDraft>): void {
    this.draft.update(current => ({ ...current, ...patch }));
    this.yamlTouched.set(true);
    this.copied.set(false);
  }

  patchNumber(
    key: keyof Pick<
      WorkflowDraft,
      | 'version'
      | 'sizeZscore'
      | 'sizeMaxCipherLen'
      | 'rateMaxEvents'
      | 'rateWindowSec'
      | 'projectionVersion'
    >,
    raw: string,
  ): void {
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    this.patchDraft({ [key]: n } as Partial<WorkflowDraft>);
  }

  async copyYaml(): Promise<void> {
    if (!this.exportReady()) return;
    const text = this.yamlPreview();
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(true);
    } catch {
      this.copied.set(false);
    }
  }

  downloadYaml(): void {
    if (!this.exportReady()) return;
    const blob = new Blob([this.yamlPreview()], { type: 'text/yaml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = this.yamlFilename();
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
