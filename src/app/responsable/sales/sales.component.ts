import { Component, OnInit } from '@angular/core';
import { StockService } from '../../services/stock.service';
import { SaleService } from '../../services/sale.service';
import { CustomerService } from '../../services/customer.service';
import { BarcodeFormat } from '@zxing/library';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Sale, SaleItem } from '../../models/sale';
import { MatDialog } from '@angular/material/dialog';
import { SalesReportsComponent } from '../sales-reports/sales-reports.component';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { StockItem } from 'src/app/models/stock-items';

@Component({
  selector: 'app-sales',
  templateUrl: './sales.component.html',
  styleUrls: ['./sales.component.css']
})
export class SalesComponent implements OnInit {
  availableProducts: StockItem[] = [];
  selectedProductId: string = '';
  selectedQuantity: number = 1;
  selectedProduct: StockItem | null = null;
  searchTerm = '';
  filteredSalesHistory: Sale[] = [];
  loadingStats = true;
  statsError: string | null = null;
  loadingHistory = true;
  historyError: string | null = null;

  // Scanner
  scannerEnabled = false;
  hasPermission = false;
  allowedFormats = [BarcodeFormat.QR_CODE];

  // Panier
  currentSale: Omit<Sale, 'id' | 'invoiceNumber'> & { invoiceNumber?: string } = {
    items: [],
    subTotal: 0,
    discount: 0,
    discountAmount: 0,
    totalAmount: 0,
    paymentMethod: 'cash',
    customerId: '',
    userId: 'current-user-id',
    date: new Date().toISOString()
  };

  // Données
  salesHistory: Sale[] = [];
  customers: any[] = [];
  dailyRevenue = 0;
  dailySalesCount = 0;
  historyFilter = 'today';

  paymentMethods = [
    { value: 'cash', label: 'Espèces', icon: 'fas fa-money-bill-wave' },
    { value: 'card', label: 'Carte', icon: 'fas fa-credit-card' },
    { value: 'credit', label: 'Crédit', icon: 'fas fa-hand-holding-usd' }
  ];

  constructor(
    private stockService: StockService,
    private saleService: SaleService,
    private customerService: CustomerService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
  }

  private loadInitialData(): void {
    this.loadStock();
    this.loadCustomers();
    this.loadSalesHistory();
    this.loadDailyStats();
  }

  private loadStock(): void {
    this.stockService.getStock().subscribe({
      next: (items: StockItem[]) => this.availableProducts = items,
      error: (err) => console.error('Erreur chargement stock:', err)
    });
  }

  private loadCustomers(): void {
    this.customerService.getCustomers().subscribe({
      next: (customers) => this.customers = customers,
      error: (err) => console.error('Erreur chargement clients:', err)
    });
  }

  private loadDailyStats(): void {
    this.loadingStats = true;
    this.statsError = null;
    
    const todayStart = startOfDay(new Date()).toISOString();
    const todayEnd = endOfDay(new Date()).toISOString();
    
    this.saleService.getSalesByDateRange(todayStart, todayEnd).subscribe({
      next: (sales: Sale[]) => {
        this.dailySalesCount = sales.length;
        this.dailyRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        this.loadingStats = false;
      },
      error: (err) => {
        console.error('Erreur stats quotidiennes:', err);
        this.statsError = 'Erreur de chargement des statistiques';
        this.loadingStats = false;
      }
    });
  }

  public loadSalesHistory(): void {
    this.loadingHistory = true;
    this.historyError = null;
    
    this.saleService.getSalesHistory(this.historyFilter).subscribe({
      next: (sales: Sale[]) => {
        this.salesHistory = sales;
        this.filteredSalesHistory = [...sales];
        this.loadingHistory = false;
      },
      error: (err) => {
        console.error('Erreur chargement historique:', err);
        this.historyError = 'Erreur de chargement de l\'historique';
        this.loadingHistory = false;
      }
    });
  }

  // Gestion du scanner
  openScanner(): void {
    this.scannerEnabled = true;
  }

  closeScanner(): void {
    this.scannerEnabled = false;
  }

  handleScanSuccess(result: string): void {
    this.selectedProduct = this.availableProducts.find(p => p.idProduit === result) || null;
    if (this.selectedProduct) {
      this.selectedProductId = this.selectedProduct.idProduit;
      this.selectedQuantity = 1;
    }
    this.closeScanner();
  }

  // Gestion des produits
  onProductSelect(): void {
    if (this.selectedProductId) {
      this.stockService.getProduct(this.selectedProductId).subscribe({
        next: (product) => this.selectedProduct = product,
        error: (err) => console.error('Erreur chargement produit:', err)
      });
    } else {
      this.selectedProduct = null;
    }
  }

  incrementQuantity(): void {
    if (this.selectedProduct && this.selectedQuantity < (this.selectedProduct.quantite || 0)) {
      this.selectedQuantity++;
    }
  }

  decrementQuantity(): void {
    if (this.selectedQuantity > 1) {
      this.selectedQuantity--;
    }
  }

  // Gestion du panier
  get canAddToCart(): boolean {
    return !!this.selectedProduct && 
           this.selectedQuantity > 0 &&
           this.selectedQuantity <= (this.selectedProduct.quantite || 0);
  }

  addToCart(): void {
    if (!this.selectedProduct || !this.canAddToCart) return;
  
    const existingItem = this.currentSale.items.find(item => 
      item.productId === this.selectedProduct?.idProduit 
    );    
    if (existingItem) {
      existingItem.quantity += this.selectedQuantity;
      existingItem.totalPrice = existingItem.quantity * existingItem.unitPrice;
    } else {
      const newItem: SaleItem = {
        productId: this.selectedProduct.idProduit,
        name: this.selectedProduct.nomProduit,
        quantity: this.selectedQuantity,
        unitPrice: this.selectedProduct.prixDeVente,
        totalPrice: this.selectedQuantity * this.selectedProduct.prixDeVente,
        imageUrl: this.selectedProduct.imageUrl || null // Changement ici: undefined → null
      };
      this.currentSale.items.push(newItem);
    }
  
    this.updateCartTotals();
    this.clearSelection();
  }

  removeItem(index: number): void {
    this.currentSale.items.splice(index, 1);
    this.updateCartTotals();
  }

  updateCartTotals(): void {
    this.currentSale.subTotal = this.currentSale.items.reduce((sum, item) => sum + item.totalPrice, 0);
    this.updateDiscount();
  }

  updateDiscount(): void {
    this.currentSale.discountAmount = this.currentSale.subTotal * (this.currentSale.discount / 100);
    this.currentSale.totalAmount = this.currentSale.subTotal - this.currentSale.discountAmount;
  }

  private clearSelection(): void {
    this.selectedProductId = '';
    this.selectedProduct = null;
    this.selectedQuantity = 1;
  }

  // Finalisation de la vente
  get canFinalize(): boolean {
    return this.currentSale.items.length > 0 && this.currentSale.totalAmount > 0;
  }

  async finalizeSale(): Promise<void> {
    if (!this.canFinalize) return;
  
    try {
      // Supprimez .toPromise() car createSale() retourne déjà une Promise
      const createdSale = await this.saleService.createSale(this.currentSale);
      this.printInvoice(createdSale);
      this.resetSale();
      this.loadDailyStats();
      this.loadSalesHistory();
    } catch (error: unknown) {
      console.error('Erreur détaillée:', error);
      alert(`Échec de la vente : ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  resetSale(): void {
    this.currentSale = {
      items: [],
      subTotal: 0,
      discount: 0,
      discountAmount: 0,
      totalAmount: 0,
      paymentMethod: 'cash',
      customerId: '',
      userId: 'current-user-id',
      date: new Date().toISOString()
    };
  }

  // Facturation
  printInvoice(sale: Sale): void {
    const doc = new jsPDF();
    
    // En-tête
    doc.setFontSize(22);
    doc.setTextColor(41, 128, 185);
    doc.text('FACTURE', 105, 25, { align: 'center' });
    
    // Informations de base
    autoTable(doc, {
      body: [
        ['N° Facture', sale.invoiceNumber || ''],
        ['Date', format(new Date(sale.date), 'dd/MM/yyyy')],
        ['Méthode de paiement', this.getPaymentMethodLabel(sale.paymentMethod)]
      ],
      startY: 35,
      theme: 'plain',
      styles: { cellPadding: 3, fontSize: 10 }
    });

    // Articles
    autoTable(doc, {
      head: [['Produit', 'Prix unitaire', 'Quantité', 'Total']],
      body: sale.items.map(item => [
        item.name,
        `${item.unitPrice.toFixed(2)} DT`,
        item.quantity.toString(),
        `${item.totalPrice.toFixed(2)} DT`
      ]),
      startY: 70,
      styles: { cellPadding: 5, fontSize: 10 },
      headStyles: { fillColor: [41, 128, 185] }
    });

    // Totaux
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Total: ${sale.totalAmount.toFixed(2)} DT`, 140, finalY, { align: 'right' });
    
    // Sauvegarde
    doc.save(`facture-${sale.invoiceNumber || 'temp'}.pdf`);
  }

  // Utilitaires
  getPaymentMethodLabel(method: string): string {
    return this.paymentMethods.find(m => m.value === method)?.label || method;
  }

  getPaymentMethodIcon(method: string): string {
    return this.paymentMethods.find(m => m.value === method)?.icon || 'fas fa-question-circle';
  }

  applySearchFilter(): void {
    const search = this.searchTerm.toLowerCase().trim();
    
    if (!search) {
      this.filteredSalesHistory = [...this.salesHistory];
      return;
    }

    this.filteredSalesHistory = this.salesHistory.filter(sale => 
      (sale.invoiceNumber || '').toLowerCase().includes(search) ||
      sale.items.some(item => item.name.toLowerCase().includes(search)) ||
      format(new Date(sale.date), 'dd/MM/yyyy').includes(search)
    );
  }

  showReports(): void {
    this.dialog.open(SalesReportsComponent, {
      width: '95vw',
      height: '90vh',
      maxWidth: '1400px',
      panelClass: 'reports-dialog',
      data: {
        salesHistory: this.salesHistory,
        dailyRevenue: this.dailyRevenue,
        dailySalesCount: this.dailySalesCount
      }
    });
  }
}
