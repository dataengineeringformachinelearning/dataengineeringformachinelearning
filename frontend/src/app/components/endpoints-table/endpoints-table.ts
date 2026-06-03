import {
  Component,
  Input,
  Output,
  EventEmitter,
  PLATFORM_ID,
  inject,
  OnChanges,
  SimpleChanges,
  ViewEncapsulation,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AgGridModule } from 'ag-grid-angular';
import {
  ColDef,
  ModuleRegistry,
  AllCommunityModule,
  GridReadyEvent,
  SelectionChangedEvent,
} from 'ag-grid-community';
import { EndpointData } from '../../services/monitor.service';

@Component({
  selector: 'app-endpoints-table',
  standalone: true,
  imports: [CommonModule, AgGridModule],
  templateUrl: './endpoints-table.html',
  styleUrl: './endpoints-table.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
  encapsulation: ViewEncapsulation.None,
})
export class EndpointsTable implements OnChanges {
  @Input() rowData: EndpointData[] = [];
  @Output() selectionChanged = new EventEmitter<EndpointData[]>();

  isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  public columnDefs: ColDef[] = [
    {
      field: 'url',
      headerName: 'Endpoint',
      checkboxSelection: true,
      headerCheckboxSelection: true,
      flex: 2,
      valueFormatter: params => {
        try {
          const urlObj = new URL(params.value);
          return urlObj.pathname + urlObj.search;
        } catch (e) {
          return params.value;
        }
      },
    },
    { field: 'status_code', headerName: 'Status', flex: 1 },
    { field: 'response_time', headerName: 'Response Time (s)', flex: 1 },
    {
      field: 'last_tested',
      headerName: 'Last Tested',
      valueFormatter: params => new Date(params.value).toLocaleString(),
      flex: 2,
    },
  ];

  public defaultColDef: ColDef = {
    sortable: true,
    filter: true,
  };

  private gridApi: any;

  private static modulesRegistered = false;

  constructor() {
    if (this.isBrowser && !EndpointsTable.modulesRegistered) {
      ModuleRegistry.registerModules([AllCommunityModule]);
      EndpointsTable.modulesRegistered = true;
    }
  }

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
  }

  onSelectionChangedEvent(event: SelectionChangedEvent) {
    const selectedData = this.gridApi.getSelectedRows();
    this.selectionChanged.emit(selectedData);
  }

  private cdr = inject(ChangeDetectorRef);

  ngOnChanges(changes: SimpleChanges) {
    if (changes['rowData'] && this.gridApi) {
      this.gridApi.setGridOption('rowData', this.rowData);
    }
    this.cdr.detectChanges();
  }
}
