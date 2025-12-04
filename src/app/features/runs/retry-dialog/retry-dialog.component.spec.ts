import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RetryDialogComponent } from './retry-dialog.component';

describe('RetryDialogComponent', () => {
  let component: RetryDialogComponent;
  let fixture: ComponentFixture<RetryDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RetryDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RetryDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
