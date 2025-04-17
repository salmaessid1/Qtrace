import { Component, OnInit } from '@angular/core';
import { EmailService } from '../../services/email.service';
import { AngularFireDatabase } from '@angular/fire/compat/database';
import { Supplier } from '../../models/supplier'; 
import { SupplierService } from 'src/app/services/supplier.service';
import { Product } from '../../models/product';
import { ProductService } from '../../services/product.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-commande-fournisseur',
  templateUrl: './commande-fournisseur.component.html',
  styleUrls: ['./commande-fournisseur.component.css']
})
export class CommandeFournisseurComponent implements OnInit {
  newOrder: any = {
    id: '',
    quantity: 1,
    unitPrice: 0,
    totalHT: 0,
    totalTTC: 0,
    deliveryDate: ''
  };
  suppliers: Supplier[] = []; 
  products: Product[] = [];
  filteredProducts: Product[] = [];
  selectedSupplier?: Supplier;
  selectedProduct?: Product;
  productSearchTerm = '';

  constructor(
    private emailService: EmailService,
    private db: AngularFireDatabase,
    private supplierService: SupplierService,
    private productService: ProductService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.loadSuppliers();
    this.loadProducts();
    this.generateOrderId();
    this.route.queryParams.subscribe(params => {
      if (params['productId']) {
        this.productService.getProductById(params['productId']).subscribe(product => {
          if (product) {
            this.selectedProduct = product;
            this.onProductSelected();
          }
        });
      }
    });
  }

  loadSuppliers() {
    this.supplierService.getAll().subscribe(suppliers => {
      this.suppliers = suppliers;
    });
  }

  loadProducts() {
    this.productService.getProducts().subscribe(products => {
      this.products = products;
      this.filteredProducts = [...products];
    });
  }

  filterProducts() {
    if (!this.productSearchTerm) {
      this.filteredProducts = [...this.products];
      return;
    }
    
    const term = this.productSearchTerm.toLowerCase();
    this.filteredProducts = this.products.filter(product => 
      product.name.toLowerCase().includes(term) || 
      product.id.toLowerCase().includes(term)
    );
  }

  onProductSelected() {
    if (this.selectedProduct) {
      this.newOrder.productId = this.selectedProduct.id;
      this.newOrder.productName = this.selectedProduct.name;
      if (!this.newOrder.unitPrice || this.newOrder.unitPrice === 0) {
        this.newOrder.unitPrice = this.selectedProduct.costPrice;
      }
      this.calculateTotals();
    }
  }

  calculateTotals() {
    if (this.newOrder.quantity && this.newOrder.unitPrice) {
      const quantity = Number(this.newOrder.quantity);
      const unitPrice = Number(this.newOrder.unitPrice);
      
      this.newOrder.totalHT = quantity * unitPrice;
      this.newOrder.totalTTC = this.newOrder.totalHT * 1.19;
    } else {
      this.newOrder.totalHT = 0;
      this.newOrder.totalTTC = 0;
    }
  }

  sendOrder() {
    if (!this.selectedSupplier || !this.selectedProduct) {
      alert('Veuillez sélectionner un fournisseur et un produit');
      return;
    }

    if (!this.newOrder.id) {
      this.newOrder.id = this.generateOrderId();
    }  
    
    const orderData = {
      ...this.newOrder,
      deliveryDate: new Date(this.newOrder.deliveryDate).toISOString(), 
      id: this.newOrder.id,
      idProduit: this.selectedProduct.id, 
      productName: this.selectedProduct.name,
      dateCommande: new Date().toISOString(),
      status: "En attente",
      supplierId: this.selectedSupplier.id, 
      supplierName: this.selectedSupplier.name,
      supplierEmail: this.selectedSupplier.email,
      unitPrice: this.newOrder.unitPrice
    };

    this.db.object(`/historique-commandes/${orderData.id}`).set(orderData)
      .then(() => {
        alert('Commande envoyée avec succès!');
        this.emailService.sendEmail(orderData);
        this.resetForm();
      })
      .catch(error => {
        console.error("Erreur:", error);
        alert(`Erreur lors de l'enregistrement: ${error.message}`);
      });
  }

  private generateOrderId(): string {
    const date = new Date();
    const datePart = date.toISOString().slice(2, 10).replace(/-/g, '');
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    this.newOrder.id = `CMD-${datePart}-${randomPart}`; 
    return this.newOrder.id;
  }
  
  get formattedProductId(): string {
    if (!this.selectedProduct?.id) return '';
    return `REF-${this.selectedProduct.id}`;
  } 
  
  private resetForm() {
    this.newOrder = {
      id: this.generateOrderId(),
      quantity: 1,
      unitPrice: 0,
      totalHT: 0,
      totalTTC: 0,
      deliveryDate: ''
    };
    this.selectedSupplier = undefined;
    this.selectedProduct = undefined;
    this.productSearchTerm = '';
    this.filterProducts();
  }
}