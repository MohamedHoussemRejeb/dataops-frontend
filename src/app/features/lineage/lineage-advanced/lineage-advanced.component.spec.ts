import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LineageEnterpriseComponent } from './lineage-advanced.component';

describe('LineageAdvancedComponent', () => {
  let component: LineageEnterpriseComponent;
  let fixture: ComponentFixture<LineageEnterpriseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LineageEnterpriseComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LineageEnterpriseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
