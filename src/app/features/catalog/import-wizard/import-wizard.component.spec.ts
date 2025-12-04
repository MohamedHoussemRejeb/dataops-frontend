import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportWizardComponent } from './import-wizard.component';

describe('ImportWizardComponent', () => {
  let component: ImportWizardComponent;
  let fixture: ComponentFixture<ImportWizardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportWizardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImportWizardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
