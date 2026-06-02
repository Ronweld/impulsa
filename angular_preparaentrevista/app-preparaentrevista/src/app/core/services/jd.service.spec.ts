import { TestBed } from '@angular/core/testing';

import { JdService } from './jd.service';

describe('JdService', () => {
  let service: JdService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(JdService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
