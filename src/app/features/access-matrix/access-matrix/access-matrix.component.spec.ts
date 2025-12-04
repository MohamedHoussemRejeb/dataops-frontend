import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccessMatrixComponent } from './access-matrix.component';

describe('AccessMatrixComponent', () => {
  let component: AccessMatrixComponent;
  let fixture: ComponentFixture<AccessMatrixComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccessMatrixComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccessMatrixComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
