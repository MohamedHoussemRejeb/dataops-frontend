import { TestBed } from '@angular/core/testing';

import { Runs } from './runs';

describe('Runs', () => {
  let service: Runs;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Runs);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
