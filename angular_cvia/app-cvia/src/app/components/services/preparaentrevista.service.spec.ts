import { TestBed } from '@angular/core/testing';

import { PreparaentrevistaService } from './preparaentrevista.service';

describe('PreparaentrevistaService', () => {
  let service: PreparaentrevistaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PreparaentrevistaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
