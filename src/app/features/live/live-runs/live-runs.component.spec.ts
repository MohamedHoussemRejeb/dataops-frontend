import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LiveRunsComponent } from './live-runs.component';

describe('LiveRunsComponent', () => {
  let component: LiveRunsComponent;
  let fixture: ComponentFixture<LiveRunsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LiveRunsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LiveRunsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
