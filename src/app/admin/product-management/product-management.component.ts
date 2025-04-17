import { Component, OnInit, OnDestroy } from '@angular/core';
import { AngularFireDatabase } from '@angular/fire/compat/database';
import { SnapshotAction } from '@angular/fire/compat/database';
import { StockService } from 'src/app/services/stock.service';
import { combineLatest, Subject } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';

@Component({
  selector: 'app-product-management',
  templateUrl: './product-management.component.html',
  styleUrls: ['./product-management.component.css']
})
export class ProductManagementComponent implements OnInit, OnDestroy {
  products: any[] = [];
  filteredProducts: any[] = [];
  searchQuery: string = '';
  loading: boolean = true;
  private destroy$ = new Subject<void>();

  constructor(
    private db: AngularFireDatabase,
    private stockService: StockService
  ) {}

  ngOnInit() {
    this.loadProducts();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadProducts() {
    combineLatest([
      this.db.list('products').snapshotChanges(),
      this.stockService.getStock()
    ]).pipe(
      takeUntil(this.destroy$),
      map(([products, stockItems]) => {
        return products.map(product => {
          const productData = product.payload.val() as any;
          const stockItem = stockItems.find(item => item.idProduit === product.key);
          
          // Fusion des données produit et stock
          return {
            id: product.key,
            ...productData,
            ...(stockItem || {}),
            nomProduit: stockItem?.nomProduit || productData.name,
            quantite: stockItem?.quantite || productData.quantity,
            prixDeVente: stockItem?.prixDeVente || productData.price
          };
        });
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

  applySearch() {
    const query = this.searchQuery.toLowerCase().trim();
    if (!query) {
      this.filteredProducts = [...this.products];
      return;
    }

    this.filteredProducts = this.products.filter(product => {
      return (
        (product.nomProduit?.toLowerCase().includes(query) || 
         product.name?.toLowerCase().includes(query)) ||
        (product.type?.toLowerCase().includes(query)) ||
        (product.category?.toLowerCase().includes(query)) ||
        (product.id?.toLowerCase().includes(query)));
    });
  }

  getStatusLabel(status: string): string {
    const statusMap: {[key: string]: string} = {
      'active': 'Actif',
      'inactive': 'Inactif',
      'critical': 'Critique',
      'normal': 'Normal',
      'promotion': 'En promotion'
    };
    return statusMap[status] || status;
  }

  viewDetails(product: any) {
    const details = `
      Référence: REF-${product.id.slice(0, 8)}
      Nom: ${product.nomProduit || product.name}
      Type: ${product.type}
      Catégorie: ${product.category}
      Description: ${product.description || 'Non disponible'}
      Quantité: ${product.quantite || product.stockQuantity || 0}
      Prix: ${(product.prixDeVente || product.price || 0).toFixed(2)} DT
      Statut: ${this.getStatusLabel(product.status || 'active')}
      Dernière mise à jour: ${product.dateMiseAJour || 'Non disponible'}
    `;
    alert(details);
  }

  markAsCritical(productId: string) {
    this.db.object(`products/${productId}/status`).set('critical').then(() => {
      alert("✅ Produit marqué comme critique !");
      this.loadProducts(); // Rafraîchir la liste
    }).catch(error => {
      console.error('Erreur:', error);
      alert(`❌ Erreur: ${error.message}`);
    });
  }
}