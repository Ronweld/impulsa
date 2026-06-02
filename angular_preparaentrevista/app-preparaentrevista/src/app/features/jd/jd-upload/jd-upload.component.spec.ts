import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JdUploadComponent } from './jd-upload.component';

describe('JdUploadComponent', () => {
  let component: JdUploadComponent;
  let fixture: ComponentFixture<JdUploadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JdUploadComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JdUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
