import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EndpointsTable } from './endpoints-table';

describe('EndpointsTable', () => {
  let component: EndpointsTable;
  let fixture: ComponentFixture<EndpointsTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EndpointsTable],
    }).compileComponents();

    fixture = TestBed.createComponent(EndpointsTable);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
