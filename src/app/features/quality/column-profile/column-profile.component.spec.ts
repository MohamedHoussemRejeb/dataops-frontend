import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ColumnProfileComponent } from './column-profile.component';

describe('ColumnProfileComponent', () => {
  let component: ColumnProfileComponent;
  let fixture: ComponentFixture<ColumnProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ColumnProfileComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ColumnProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
