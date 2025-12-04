import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminCustomFieldsComponent } from './admin-custom-fields.component';

describe('AdminCustomFieldsComponent', () => {
  let component: AdminCustomFieldsComponent;
  let fixture: ComponentFixture<AdminCustomFieldsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminCustomFieldsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminCustomFieldsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
