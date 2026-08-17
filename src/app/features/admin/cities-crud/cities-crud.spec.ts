import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CitiesCrudComponent } from './cities-crud';

describe('CitiesCrudComponent', () => {
  let component: CitiesCrudComponent;
  let fixture: ComponentFixture<CitiesCrudComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CitiesCrudComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CitiesCrudComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
