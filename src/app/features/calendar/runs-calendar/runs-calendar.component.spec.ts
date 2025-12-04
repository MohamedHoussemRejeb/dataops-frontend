import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RunsCalendarComponent } from './runs-calendar.component';

describe('RunsCalendarComponent', () => {
  let component: RunsCalendarComponent;
  let fixture: ComponentFixture<RunsCalendarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RunsCalendarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RunsCalendarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
