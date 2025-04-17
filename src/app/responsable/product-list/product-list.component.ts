import { Component, OnInit, OnDestroy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { ProductService } from '../../services/product.service';
import { Product } from '../../models/product';
import { StockItem, StockService } from 'src/app/services/stock.service';
import { Subject, combineLatest } from 'rxjs'; 
import { takeUntil, map } from 'rxjs/operators'; 

@Component({
  selector: 'app-product-list',
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.css'],
})
export class ProductListComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  searchTerm: string = '';
  loading: boolean = true;
  selectedCategory: string = '';
  selectedType: string = '';
  categories: string[] = [];
  types: string[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private productService: ProductService,
    private router: Router,
    private stockService: StockService
  ) {}

  ngOnInit(): void {
    this.loadProducts();
    
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        const navigation = this.router.getCurrentNavigation();
        const state = navigation?.extras.state as { 
          shouldRefresh?: boolean;
          successMessage?: string;
        };
        
        if (state?.successMessage) {
          alert(state.successMessage);
        }
        
        if (state?.shouldRefresh) {
          this.loadProducts();
        }
      }
    });
  }
  
  private loadProducts(): void {
    combineLatest([
      this.productService.getProducts(),
      this.stockService.getStock()
    ]).pipe(
      takeUntil(this.destroy$),
      map(([products, stockItems]) => {
        const enrichedProducts = products.map(product => {
          const stockItem = stockItems.find(item => item.idProduit === product.id);
          return {
            ...product,
            stockQuantity: stockItem ? stockItem.quantite : 0
          };
        });
        
        this.extractFilters(enrichedProducts);
        return enrichedProducts;
      })
    ).subscribe({
      next: (products) => {
        this.products = products;
        this.filteredProducts = [...products];
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur de chargement:', error);
        this.loading = false;
      }
    });
  }

  private extractFilters(products: Product[]): void {
    this.categories = [...new Set(products.map(p => p.category))].filter(c => c);
    this.types = [...new Set(products.map(p => p.type))].filter(t => t);
  }

  getStatusLabel(status: string): string {
    const statusMap: {[key: string]: string} = {
      'active': 'Actif',
      'inactive': 'Inactif',
      'promotion': 'En promotion'
    };
    return statusMap[status] || status;
  }

  filterProducts(): void {
    const searchLower = this.searchTerm.toLowerCase().trim();
    
    this.filteredProducts = this.products.filter(product => {
      const matchesSearch = 
        product.name?.toLowerCase().includes(searchLower) ||
        product.id?.toLowerCase().includes(searchLower) ||
        product.type?.toLowerCase().includes(searchLower) ||
        product.category?.toLowerCase().includes(searchLower);
      
      const matchesCategory = !this.selectedCategory || 
        product.category === this.selectedCategory;
      
      const matchesType = !this.selectedType || 
        product.type === this.selectedType;
      
      return matchesSearch && matchesCategory && matchesType;
    });
  }

  viewDetails(id: string): void {
    this.router.navigate(['responsable', 'product-details', id]).then(success => {
      if (!success) {
        console.error('Échec de navigation - Vérifiez la configuration des routes');
        window.location.assign(`/responsable/product-details/${id}`);
      }
    });
  }
  
  editProduct(id: string): void {
    this.router.navigate(['/responsable/edit-product', id]);
  }

  deleteProduct(id: string): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
      this.productService.deleteProduct(id)
        .then(() => {
          this.loadProducts();
        })
        .catch(error => {
          console.error('Erreur:', error);
        });
    }
  }
 
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}