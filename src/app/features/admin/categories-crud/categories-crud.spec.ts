import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CategoriesCrud } from './categories-crud';

describe('CategoriesCrud', () => {
  let component: CategoriesCrud;
  let fixture: ComponentFixture<CategoriesCrud>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoriesCrud],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoriesCrud);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
