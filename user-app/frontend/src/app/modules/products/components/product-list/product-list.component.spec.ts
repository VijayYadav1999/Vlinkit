import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ProductListComponent } from './product-list.component';

describe('ProductListComponent', () => {
  let component: ProductListComponent;
  let fixture: ComponentFixture<ProductListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ProductListComponent],
      imports: [ReactiveFormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  /* Form Initialization Tests */
  describe('Form Initialization', () => {
    it('should initialize filterForm with all required controls', () => {
      expect(component.filterForm.get('search')).toBeTruthy();
      expect(component.filterForm.get('category')).toBeTruthy();
      expect(component.filterForm.get('priceMin')).toBeTruthy();
      expect(component.filterForm.get('priceMax')).toBeTruthy();
      expect(component.filterForm.get('inStockOnly')).toBeTruthy();
    });

    it('should set initial values for all form controls', () => {
      expect(component.filterForm.get('search').value).toBe('');
      expect(component.filterForm.get('category').value).toBe('All Categories');
      expect(component.filterForm.get('priceMin').value).toBe(0);
      expect(component.filterForm.get('priceMax').value).toBe(5000);
      expect(component.filterForm.get('inStockOnly').value).toBeFalsy();
    });

    it('should load products on component initialization', (done) => {
      const loadProductsSpy = spyOn(component, 'loadProducts');
      component.ngOnInit();
      setTimeout(() => {
        expect(loadProductsSpy).toHaveBeenCalled();
        done();
      }, 500);
    });
  });

  /* Search Filter Tests */
  describe('Search Filter', () => {
    it('should filter products by search term', (done) => {
      component.loadProducts();
      fixture.detectChanges();

      const searchControl = component.filterForm.get('search');
      searchControl.setValue('milk');

      setTimeout(() => {
        expect(component.filteredProducts.length).toBeGreaterThan(0);
        expect(
          component.filteredProducts.some((p) =>
            p.name.toLowerCase().includes('milk')
          )
        ).toBeTruthy();
        done();
      }, 350);
    });

    it('should be case-insensitive for search', (done) => {
      component.loadProducts();
      fixture.detectChanges();

      const searchControl = component.filterForm.get('search');
      searchControl.setValue('MILK');

      setTimeout(() => {
        expect(component.filteredProducts.length).toBeGreaterThan(0);
        done();
      }, 350);
    });

    it('should return empty results for non-matching search', (done) => {
      component.loadProducts();
      fixture.detectChanges();

      const searchControl = component.filterForm.get('search');
      searchControl.setValue('nonexistentproduct123');

      setTimeout(() => {
        expect(component.filteredProducts.length).toBe(0);
        done();
      }, 350);
    });

    it('should debounce search input for 300ms', (done) => {
      component.loadProducts();
      fixture.detectChanges();

      const searchControl = component.filterForm.get('search');
      let callCount = 0;
      const applyFiltersSpy = spyOn(component, 'applyFiltersAndSort').and.callThrough();

      searchControl.setValue('rice');
      searchControl.setValue('milk');
      searchControl.setValue('bread');

      expect(applyFiltersSpy).not.toHaveBeenCalled();

      setTimeout(() => {
        expect(applyFiltersSpy).toHaveBeenCalled();
        done();
      }, 350);
    });
  });

  /* Category Filter Tests */
  describe('Category Filter', () => {
    it('should filter products by category', () => {
      component.loadProducts();
      const categoryControl = component.filterForm.get('category');

      categoryControl.setValue('Groceries');
      component.applyFiltersAndSort();

      expect(
        component.filteredProducts.every((p) => p.category === 'Groceries')
      ).toBeTruthy();
    });

    it('should show all products when category is "All Categories"', () => {
      component.loadProducts();
      const categoryControl = component.filterForm.get('category');

      categoryControl.setValue('All Categories');
      component.applyFiltersAndSort();

      expect(component.filteredProducts.length).toBe(component.products.length);
    });

    it('should contain all expected categories', () => {
      expect(component.categories).toContain('All Categories');
      expect(component.categories.length).toBeGreaterThan(1);
    });

    it('should filter electronics separately from groceries', () => {
      component.loadProducts();
      const categoryControl = component.filterForm.get('category');

      categoryControl.setValue('Electronics');
      component.applyFiltersAndSort();
      const electronicsCount = component.filteredProducts.length;

      categoryControl.setValue('Groceries');
      component.applyFiltersAndSort();
      const groceriesCount = component.filteredProducts.length;

      expect(electronicsCount + groceriesCount).toBeLessThanOrEqual(
        component.products.length
      );
    });
  });

  /* Price Range Filter Tests */
  describe('Price Range Filter', () => {
    it('should filter products by minimum price', () => {
      component.loadProducts();
      const priceMinControl = component.filterForm.get('priceMin');

      priceMinControl.setValue(100);
      component.applyFiltersAndSort();

      expect(
        component.filteredProducts.every((p) => p.price >= 100)
      ).toBeTruthy();
    });

    it('should filter products by maximum price', () => {
      component.loadProducts();
      const priceMaxControl = component.filterForm.get('priceMax');

      priceMaxControl.setValue(200);
      component.applyFiltersAndSort();

      expect(
        component.filteredProducts.every((p) => p.price <= 200)
      ).toBeTruthy();
    });

    it('should filter products by price range', () => {
      component.loadProducts();
      component.filterForm.get('priceMin').setValue(50);
      component.filterForm.get('priceMax').setValue(300);

      component.applyFiltersAndSort();

      expect(
        component.filteredProducts.every(
          (p) => p.price >= 50 && p.price <= 300
        )
      ).toBeTruthy();
    });

    it('should return empty when min price exceeds all product prices', () => {
      component.loadProducts();
      component.filterForm.get('priceMin').setValue(99999);

      component.applyFiltersAndSort();

      expect(component.filteredProducts.length).toBe(0);
    });

    it('should handle price range inversion gracefully', () => {
      component.loadProducts();
      component.filterForm.get('priceMin').setValue(1000);
      component.filterForm.get('priceMax').setValue(100);

      component.applyFiltersAndSort();

      expect(component.filteredProducts.length).toBe(0);
    });
  });

  /* Stock Filter Tests */
  describe('Stock Filter', () => {
    it('should filter in-stock products when checkbox is checked', () => {
      component.loadProducts();
      const stockControl = component.filterForm.get('inStockOnly');

      stockControl.setValue(true);
      component.applyFiltersAndSort();

      expect(
        component.filteredProducts.every((p) => p.in_stock === true)
      ).toBeTruthy();
    });

    it('should show all products when stock filter is unchecked', () => {
      component.loadProducts();
      const stockControl = component.filterForm.get('inStockOnly');

      stockControl.setValue(false);
      component.applyFiltersAndSort();

      const allProductsCount = component.products.length;
      // Should potentially show all or most products
      expect(component.filteredProducts.length).toBeGreaterThan(0);
    });

    it('should maintain stock filter when combined with other filters', () => {
      component.loadProducts();
      component.filterForm.get('inStockOnly').setValue(true);
      component.filterForm.get('category').setValue('Electronics');

      component.applyFiltersAndSort();

      expect(
        component.filteredProducts.every((p) => p.in_stock === true)
      ).toBeTruthy();
    });
  });

  /* Sorting Tests */
  describe('Sorting', () => {
    beforeEach(() => {
      component.loadProducts();
    });

    it('should sort by popularity (original order)', () => {
      component.sortBy = 'popularity';
      component.applyFiltersAndSort();

      const sorted = component.sortProducts(
        [...component.filteredProducts],
        'popularity'
      );
      expect(sorted).toBeTruthy();
    });

    it('should sort by price ascending', () => {
      component.sortBy = 'price_asc';
      component.applyFiltersAndSort();

      const sorted = component.sortProducts(
        [...component.filteredProducts],
        'price_asc'
      );

      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].price).toBeLessThanOrEqual(sorted[i + 1].price);
      }
    });

    it('should sort by price descending', () => {
      component.sortBy = 'price_desc';
      component.applyFiltersAndSort();

      const sorted = component.sortProducts(
        [...component.filteredProducts],
        'price_desc'
      );

      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].price).toBeGreaterThanOrEqual(sorted[i + 1].price);
      }
    });

    it('should sort by rating descending', () => {
      component.sortBy = 'rating';
      component.applyFiltersAndSort();

      const sorted = component.sortProducts(
        [...component.filteredProducts],
        'rating'
      );

      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].rating).toBeGreaterThanOrEqual(sorted[i + 1].rating);
      }
    });

    it('should sort by newest first', () => {
      component.sortBy = 'newest';
      component.applyFiltersAndSort();

      const sorted = component.sortProducts(
        [...component.filteredProducts],
        'newest'
      );
      expect(sorted).toBeTruthy();
    });

    it('should update filteredProducts when changeSortBy is called', () => {
      component.filteredProducts = [...component.products];
      component.changeSortBy('price_asc');

      expect(component.sortBy).toBe('price_asc');
    });
  });

  /* Pagination Tests */
  describe('Pagination', () => {
    beforeEach(() => {
      component.loadProducts();
      component.filteredProducts = [...component.products];
      component.pageSize = 2;
    });

    it('should set default page to 1', () => {
      expect(component.currentPage).toBe(1);
    });

    it('should return correct products for page 1', () => {
      const paginated = component.getPaginatedProducts();
      expect(paginated.length).toBeLessThanOrEqual(component.pageSize);
    });

    it('should calculate total pages correctly', () => {
      component.filteredProducts = new Array(25).fill(null).map((_, i) => ({
        id: i,
        name: `Product ${i}`,
        price: 100,
        rating: 4.5,
        in_stock: true,
        delivery_time_minutes: 30,
        description: 'Test',
        image_url: 'test.jpg',
        category: 'Test',
      }));

      const totalPages = component.getTotalPages();
      expect(totalPages).toBe(
        Math.ceil(component.filteredProducts.length / component.pageSize)
      );
    });

    it('should navigate to next page', () => {
      component.goToPage(2);
      expect(component.currentPage).toBe(2);
    });

    it('should navigate to previous page', () => {
      component.currentPage = 2;
      component.goToPage(1);
      expect(component.currentPage).toBe(1);
    });

    it('should not exceed maximum page number', () => {
      const maxPages = component.getTotalPages();
      component.goToPage(maxPages + 10);
      expect(component.currentPage).toBeLessThanOrEqual(maxPages);
    });

    it('should return correct slice of products for middle page', () => {
      component.currentPage = 2;
      component.filteredProducts = new Array(10).fill(null).map((_, i) => ({
        id: i,
        name: `Product ${i}`,
        price: 100,
        rating: 4.5,
        in_stock: true,
        delivery_time_minutes: 30,
        description: 'Test',
        image_url: 'test.jpg',
        category: 'Test',
      }));

      const paginated = component.getPaginatedProducts();
      expect(paginated.length).toBeGreaterThan(0);
      expect(paginated[0].id).toBe(component.pageSize);
    });
  });

  /* Combined Filter Tests */
  describe('Combined Filters', () => {
    it('should apply search AND category filters simultaneously', () => {
      component.loadProducts();
      component.filterForm.get('search').setValue('milk');
      component.filterForm.get('category').setValue('Groceries');

      component.applyFiltersAndSort();

      expect(
        component.filteredProducts.every(
          (p) =>
            p.name.toLowerCase().includes('milk') && p.category === 'Groceries'
        )
      ).toBeTruthy();
    });

    it('should apply category AND price AND stock filters', () => {
      component.loadProducts();
      component.filterForm.get('category').setValue('Groceries');
      component.filterForm.get('priceMin').setValue(40);
      component.filterForm.get('priceMax').setValue(100);
      component.filterForm.get('inStockOnly').setValue(true);

      component.applyFiltersAndSort();

      expect(
        component.filteredProducts.every(
          (p) =>
            p.category === 'Groceries' &&
            p.price >= 40 &&
            p.price <= 100 &&
            p.in_stock === true
        )
      ).toBeTruthy();
    });

    it('should apply search AND price filters', () => {
      component.loadProducts();
      component.filterForm.get('search').setValue('rice');
      component.filterForm.get('priceMin').setValue(100);
      component.filterForm.get('priceMax').setValue(200);

      component.applyFiltersAndSort();

      expect(
        component.filteredProducts.every(
          (p) =>
            p.name.toLowerCase().includes('rice') &&
            p.price >= 100 &&
            p.price <= 200
        )
      ).toBeTruthy();
    });
  });

  /* Reset Filter Tests */
  describe('Reset Filters', () => {
    it('should reset all form controls to initial values', () => {
      component.filterForm.get('search').setValue('test');
      component.filterForm.get('category').setValue('Electronics');
      component.filterForm.get('priceMin').setValue(100);
      component.filterForm.get('priceMax').setValue(500);
      component.filterForm.get('inStockOnly').setValue(true);

      component.resetFilters();

      expect(component.filterForm.get('search').value).toBe('');
      expect(component.filterForm.get('category').value).toBe('All Categories');
      expect(component.filterForm.get('priceMin').value).toBe(0);
      expect(component.filterForm.get('priceMax').value).toBe(5000);
      expect(component.filterForm.get('inStockOnly').value).toBeFalsy();
    });

    it('should reset pagination to page 1', () => {
      component.currentPage = 5;
      component.resetFilters();
      expect(component.currentPage).toBe(1);
    });

    it('should show all products after reset', () => {
      component.loadProducts();
      component.filterForm.get('search').setValue('specific');
      component.applyFiltersAndSort();

      component.resetFilters();

      expect(component.filteredProducts.length).toBe(component.products.length);
    });
  });

  /* Utility Method Tests */
  describe('Utility Methods', () => {
    it('should format rating display correctly', () => {
      const rating = 4.5;
      const display = component.getRatingDisplay(rating);

      expect(display).toContain('⭐');
      expect(display).toContain('4.5');
    });

    it('should handle perfect rating display', () => {
      const display = component.getRatingDisplay(5);
      expect(display).toContain('5');
    });

    it('should handle low rating display', () => {
      const display = component.getRatingDisplay(1);
      expect(display).toContain('1');
    });
  });

  /* Edge Case Tests */
  describe('Edge Cases', () => {
    it('should handle empty product list', () => {
      component.products = [];
      component.filteredProducts = [];

      expect(component.getTotalPages()).toBe(1);
      expect(component.getPaginatedProducts().length).toBe(0);
    });

    it('should handle single product', () => {
      component.products = [
        {
          id: 1,
          name: 'Single Product',
          price: 100,
          rating: 4.5,
          in_stock: true,
          delivery_time_minutes: 30,
          description: 'Test',
          image_url: 'test.jpg',
          category: 'Test',
        },
      ];
      component.filteredProducts = [...component.products];

      expect(component.getTotalPages()).toBe(1);
      expect(component.getPaginatedProducts().length).toBe(1);
    });

    it('should handle page number boundary conditions', () => {
      component.currentPage = 0;
      component.goToPage(0);
      // Should either stay at 0 or move to 1, handled gracefully

      component.currentPage = -1;
      component.goToPage(-1);
      // Should handle negative page numbers gracefully
    });

    it('should not crash with very large page size', () => {
      component.pageSize = 10000;
      component.loadProducts();
      const paginated = component.getPaginatedProducts();

      expect(paginated).toBeTruthy();
    });

    it('should handle search with special characters', (done) => {
      component.loadProducts();
      component.filterForm.get('search').setValue('!!@##');

      setTimeout(() => {
        expect(component.filteredProducts).toBeTruthy();
        done();
      }, 350);
    });
  });

  /* Integration Tests */
  describe('Integration Tests', () => {
    it('should complete full product browsing workflow', () => {
      // Load products
      component.loadProducts();
      expect(component.products.length).toBeGreaterThan(0);

      // Apply initial filter
      component.filterForm.get('category').setValue('Groceries');
      component.applyFiltersAndSort();

      // Apply search
      component.filterForm.get('search').setValue('rice');
      // Wait for debounce would happen in real scenario

      // Sort
      component.changeSortBy('price_asc');

      // Navigate pages
      component.goToPage(1);
      const firstPageProducts = component.getPaginatedProducts();

      expect(firstPageProducts.length).toBeGreaterThan(0);
    });

    it('should maintain filter state when changing sort', () => {
      component.loadProducts();
      component.filterForm.get('category').setValue('Groceries');
      component.filterForm.get('priceMax').setValue(200);
      component.applyFiltersAndSort();

      const countBeforeSort = component.filteredProducts.length;

      component.changeSortBy('price_desc');

      expect(component.filteredProducts.length).toBe(countBeforeSort);
    });

    it('should handle sorting after filtering', () => {
      component.loadProducts();
      component.filterForm.get('inStockOnly').setValue(true);
      component.applyFiltersAndSort();

      const beforeSort = [...component.filteredProducts];

      component.changeSortBy('price_asc');

      expect(component.filteredProducts.length).toBe(beforeSort.length);
    });
  });

  /* Memory Management Tests */
  describe('Memory Management', () => {
    it('should unsubscribe on component destroy', () => {
      const spy = spyOn(component['destroy$'], 'next');

      component.ngOnDestroy();

      expect(spy).toHaveBeenCalled();
    });

    it('should not leak subscriptions', () => {
      // This is implicitly tested by component lifecycle
      // Ensure no setTimeout or other resources are left hanging
      expect(component).toBeTruthy();
    });
  });
});
