import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RetryAdvancedComponent } from './retry-advanced.component';

describe('RetryAdvancedComponent', () => {
  let component: RetryAdvancedComponent;
  let fixture: ComponentFixture<RetryAdvancedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RetryAdvancedComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RetryAdvancedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
