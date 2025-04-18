import { Component, LOCALE_ID, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Chart, registerables } from 'chart.js';
import { SaleService } from '../../services/sale.service';
import { StockService } from '../../services/stock.service';
import { ProductService } from '../../services/product.service';
import { ActivityService } from '../../services/activity.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { Sale } from 'src/app/models/sale';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { TimeAgoPipe } from 'src/app/pipes/time-ago.pipe';
import { Router } from '@angular/router';






Chart.register(...registerables);
interface AuthenticityStats {
  verified: number;
  suspicious: number;
  lastCheck: Date;
  verificationDetails: any;
}

interface StockMetrics {
  predictedStockouts: number;
  stockoutTrend: number;
  optimizationPotential: number;
  turnoverRate: number;
}
interface KpiCard {
  title: string;
  value: number;
  icon: string;
  trend?: number;
  comparisonValue?: number;
  description: string;
  color: string;
  isCurrency: boolean;
}

interface RecentSale {
  id: string;
  date: string;
  amount: number;
  paymentMethod: string;
  items: number;
}

interface Activity {
  icon: string;
  message: string;
  time: Date;
}

interface LowStockProduct {
  id: string;
  name: string;
  reference: string;
  category: string;
  quantity: number;
  threshold: number;
  daysUntilStockout: number;
  lastSaleDate: Date;
  supplier?: {
    id: string;
    name: string;
    leadTime: number;
    contact: string;
  };
  imageUrl?: string;
}

interface Activity {
  type: 'sales' | 'stock' | 'alerts' | 'system';
  icon: string;
  message: string;
  time: Date;
  user: string;
  location?: string;
  product?: any;
  amount?: number;
} 

@Component({
  selector: 'app-responsable-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatGridListModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
    MatTableModule,
    MatSortModule,
    MatTooltipModule,
    MatTabsModule,
    MatListModule,
    MatProgressBarModule,
    MatFormFieldModule,
    MatSelectModule,
    MatPaginatorModule,
    MatButtonToggleModule ,
    TimeAgoPipe,


  ],
  templateUrl: './responsable-dashboard.component.html',
  styleUrls: ['./responsable-dashboard.component.css'],
  providers: [ DatePipe, ]
})
export class ResponsableDashboardComponent implements OnInit {
  currentDate = new Date();
  loading = false;
  authenticityStats: AuthenticityStats = { 
    verified: 0, 
    suspicious: 0, 
    lastCheck: new Date(),
    verificationDetails: null
  };
    
  stockMetrics: StockMetrics = {
    predictedStockouts: 0,
    stockoutTrend: 0,
    optimizationPotential: 0,
    turnoverRate: 0
  };
  
  selectedPeriod = '30';
  authenticityChart: any;
  stockPredictionChart: any;


  // KPI Cards Data
  kpiCards: KpiCard[] = [
    {
      title: 'Ventes aujourd\'hui',
      value: 0,
      icon: 'shopping_cart',
      trend: 0,
      comparisonValue: 0,
      description: 'Nombre de transactions',
      color: 'primary',
      isCurrency: false
    },
    {
      title: 'Produits sortis',
      value: 0,
      icon: 'inventory',
      trend: 0,
      description: 'Total des sorties',
      color: 'accent',
      isCurrency: false
    },
    {
      title: 'Produits en faible stock',
      value: 0,
      icon: 'warning',
      description: 'Alertes de stock',
      color: 'warn',
      isCurrency: false
    },
    {
      title: 'Revenu total',
      value: 0,
      icon: 'attach_money',
      trend: 0,
      comparisonValue: 0,
      description: 'Chiffre d\'affaires',
      color: 'success',
      isCurrency: true
    },
    {
      title: 'Bénéfice',
      value: 0,
      icon: 'coins', 
      trend: 0,
      description: 'Marge bénéficiaire',
      color: 'success',
      isCurrency: true
    },
    {
      title: 'Clients',
      value: 0,
      icon: 'people',
      trend: 0,
      description: 'Nouveaux clients',
      color: 'primary',
      isCurrency: false,
      
    }
  ];
  filteredActivities: Activity[] = [];
  // Charts
  salesTrendChart: any;
  productDistributionChart: any;
  categoryPerformanceChart: any;

  // Performance Metrics
  monthlyRevenue = 0;
  monthlySales = 0;
  averageTicket = 0;
  revenueTrend = 0;
  salesTrend = 0;
  ticketTrend = 0;
  // Recent Sales Table
  recentSales: RecentSale[] = [];
  displayedColumns: string[] = ['id', 'date', 'amount', 'paymentMethod', 'items'];

  // Low Stock Products
  lowStockProducts: any[] = [];

  // Quick Actions
  quickActions = [
    { icon: 'add', label: 'Nouvelle vente', action: 'newSale', color: 'primary' },
    { icon: 'exit_to_app', label: 'Nouvelle sortie', action: 'newExit', color: 'accent' },
    { icon: 'inventory_2', label: 'Réapprovisionner', action: 'replenish', color: 'warn' },
    { icon: 'notifications', label: 'Alertes', action: 'alerts', color: 'warn' },
    { icon: 'bar_chart', label: 'Rapports', action: 'reports', color: 'primary' }
  ];

  // Recent Activities
  recentActivities: Activity[] = [];
  constructor(
    private saleService: SaleService,
    private stockService: StockService,
    private productService: ProductService,
    private activityService: ActivityService,
    private datePipe: DatePipe,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
    this.loadRecentActivities();
    this.filteredActivities = [...this.recentActivities];
  }

  loadDashboardData(): void {
    this.loading = true;
    this.loadSalesData();
    this.loadStockData();
    this.loadProductData();
    this.loadPerformanceMetrics();
  }

  loadSalesData(): void {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();
  
    // Get yesterday's date for comparison
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const startOfYesterday = new Date(yesterday.setHours(0, 0, 0, 0)).toISOString();
    const endOfYesterday = new Date(yesterday.setHours(23, 59, 59, 999)).toISOString();
  
    // Today's sales
    this.saleService.getSalesByDateRange(startOfDay, endOfDay).subscribe({
      next: (todaySales: Sale[]) => {
        // Calculate today's metrics
        let totalProductsSold = 0;
        const uniqueClientsToday = new Set<string>();
        
        todaySales.forEach(sale => {
          totalProductsSold += sale.items.reduce((sum, item) => sum + item.quantity, 0);
          if (sale.customerId) { // Modification ici
            uniqueClientsToday.add(sale.customerId); // Modification ici
          }
        });
        
        const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const todayProfit = todayRevenue * 0.3;
    
        // Update KPI cards
        this.kpiCards = this.kpiCards.map(card => {
          if (card.title === 'Ventes aujourd\'hui') {
            return { ...card, value: todaySales.length };
          }
          if (card.title === 'Produits sortis') {
            return { ...card, value: totalProductsSold };
          }
          if (card.title === 'Revenu total') {
            return { ...card, value: todayRevenue };
          }
          if (card.title === 'Bénéfice') {
            return { ...card, value: todayProfit };
          }
          if (card.title === 'Clients') {
            return { 
              ...card, 
              value: uniqueClientsToday.size,
              description: 'Clients acheteurs uniques' // Nouvelle description
            };
          }
          return card;
        });
    
        // Prepare recent sales data
        this.recentSales = todaySales.map(sale => ({
          id: sale.invoiceNumber,
          date: sale.date,
          amount: sale.totalAmount,
          paymentMethod: sale.paymentMethod,
          items: sale.items.reduce((sum, item) => sum + item.quantity, 0)
        })).slice(0, 5);
    
        // Get yesterday's data for trend calculation
        this.saleService.getSalesByDateRange(startOfYesterday, endOfYesterday).subscribe({
          next: yesterdaySales => {
            // Calculate trends
            const uniqueClientsYesterday = new Set<string>();
            yesterdaySales.forEach(sale => {
              if (sale.customerId) { // Modification ici
                uniqueClientsYesterday.add(sale.customerId); // Modification ici
              }
            });
    
            const trend = uniqueClientsYesterday.size > 0 
              ? ((uniqueClientsToday.size - uniqueClientsYesterday.size) / uniqueClientsYesterday.size) * 100 
              : 0;
    
            this.kpiCards = this.kpiCards.map(card => {
              if (card.title === 'Clients') {
                return { ...card, trend: Math.round(trend) };
              }
              return card;
            });
          },
          error: err => {
            console.error('Error loading yesterday sales:', err);
            this.calculateDailyTrends(todaySales, []);
          }
        });
      },
      error: err => {
        console.error('Error loading today sales:', err);
        this.loading = false;
      }
    });
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - 7);
  this.saleService.getSalesByDateRange(startOfWeek.toISOString(), new Date().toISOString())
  .subscribe({
    next: (weeklySales: Sale[]) => {
      this.createSalesTrendChart(weeklySales);
    },
      error: err => {
        console.error('Error loading weekly sales:', err);
      }
    });
}

  loadProductData(): void {
    this.productService.getProducts().subscribe({
      next: products => {
        this.createProductDistributionChart(products);
        this.createCategoryPerformanceChart(products);
      },
      error: err => {
        console.error('Error loading product data:', err);
        this.loading = false;
      }
    });
  }

  loadPerformanceMetrics(): void {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
    
    this.saleService.getSalesByDateRange(startOfMonth.toISOString(), endOfMonth.toISOString())
      .subscribe(sales => {
        this.monthlySales = sales.length;
        this.monthlyRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        this.averageTicket = this.monthlySales > 0 ? this.monthlyRevenue / this.monthlySales : 0;
        
        // Calculate trends (compare with previous month)
        this.calculateMonthlyTrends();
        this.loading = false;
      });
  }

  loadRecentActivities(): void {
    this.activityService.getRecentActivities().subscribe(activities => {
      this.recentActivities = activities.map(activity => ({
        ...activity,
        time: new Date(activity.time),
        user: activity.user || 'Système',
        type: activity.type || 'system'   
      }));
      this.filteredActivities = [...this.recentActivities];
    });
  }

  private calculateDailyTrends(todaySales: Sale[], yesterdaySales: Sale[]): void {
    // Calculate today's metrics
    const todayRevenue = todaySales.reduce((sum: number, sale: Sale) => sum + sale.totalAmount, 0);
    const todayProductsSold = todaySales.reduce((sum: number, sale: Sale) => 
      sum + sale.items.reduce((itemSum: number, item: { quantity: number }) => itemSum + item.quantity, 0), 0);
    
    const todayClients = new Set(todaySales
      .filter((s: Sale) => s.clientId)
      .map((s: Sale) => s.clientId as string)).size;
  
    // Calculate yesterday's metrics
    const yesterdayRevenue = yesterdaySales.reduce((sum: number, sale: Sale) => sum + sale.totalAmount, 0);
    const yesterdayProductsSold = yesterdaySales.reduce((sum: number, sale: Sale) => 
      sum + sale.items.reduce((itemSum: number, item: { quantity: number }) => itemSum + item.quantity, 0), 0);
    
    const yesterdayClients = new Set(yesterdaySales
      .filter((s: Sale) => s.clientId)
      .map((s: Sale) => s.clientId as string)).size;
  
    // Update KPI cards with trends
    this.kpiCards = this.kpiCards.map(card => {
      if (card.title === 'Ventes aujourd\'hui') {
        const trend = yesterdaySales.length > 0 ? 
          ((todaySales.length - yesterdaySales.length) / yesterdaySales.length) * 100 : 0;
        return { ...card, trend: Math.round(trend), comparisonValue: yesterdaySales.length };
      }
      if (card.title === 'Produits sortis') {
        const trend = yesterdayProductsSold > 0 ? 
          ((todayProductsSold - yesterdayProductsSold) / yesterdayProductsSold) * 100 : 0;
        return { ...card, trend: Math.round(trend) };
      }
      if (card.title === 'Revenu total') {
        const trend = yesterdayRevenue > 0 ? 
          ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0;
        return { ...card, trend: Math.round(trend), comparisonValue: yesterdayRevenue };
      }
      if (card.title === 'Clients') {
        const trend = yesterdayClients > 0 ? 
          ((todayClients - yesterdayClients) / yesterdayClients) * 100 : 0;
        return { ...card, trend: Math.round(trend) };
      }
      return card;
    });
  }
  calculateMonthlyTrends(): void {
    // In a real app, you would compare with previous month's data
    // For demo purposes, we're using random values
    this.revenueTrend = this.getRandomTrend();
    this.salesTrend = this.getRandomTrend();
    this.ticketTrend = this.getRandomTrend();
  }

  getRandomTrend(): number {
    // Returns a random number between -15 and 15
    return Math.floor(Math.random() * 30) - 15;
  }

  createSalesTrendChart(sales: any[]): void {
    const salesByDay = sales.reduce((acc, sale) => {
      const date = new Date(sale.date).toLocaleDateString();
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += sale.totalAmount;
      return acc;
    }, {});

    const labels = Object.keys(salesByDay);
    const data = Object.values(salesByDay);

    if (this.salesTrendChart) {
      this.salesTrendChart.destroy();
    }

    this.salesTrendChart = new Chart('salesTrendChart', {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Ventes (DT)',
          data: data,
          fill: false,
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Tendance des Ventes (7 derniers jours)'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return context.parsed.y + ' DT';
              }
            }
          }
        },
        scales: {
          y: {
            ticks: {
              callback: function(value) {
                return value + ' DT';
              }
            }
          }
        }
      }
    });
  }

  createProductDistributionChart(products: any[]): void {
    const productsByCategory = products.reduce((acc, product) => {
      if (!acc[product.category]) {
        acc[product.category] = 0;
      }
      acc[product.category]++;
      return acc;
    }, {});

    const labels = Object.keys(productsByCategory);
    const data = Object.values(productsByCategory);

    if (this.productDistributionChart) {
      this.productDistributionChart.destroy();
    }

    this.productDistributionChart = new Chart('productDistributionChart', {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          label: 'Produits par Catégorie',
          data: data,
          backgroundColor: [
            'rgba(255, 99, 132, 0.7)',
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 206, 86, 0.7)',
            'rgba(75, 192, 192, 0.7)',
            'rgba(153, 102, 255, 0.7)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Répartition des Produits'
          }
        }
      }
    });
  }

  createCategoryPerformanceChart(products: any[]): void {
    const categories = [...new Set(products.map(p => p.category))];
    const performanceData = categories.map(category => {
      const categoryProducts = products.filter(p => p.category === category);
      return categoryProducts.length * 100; // Simplified performance metric
    });

    if (this.categoryPerformanceChart) {
      this.categoryPerformanceChart.destroy();
    }

    this.categoryPerformanceChart = new Chart('categoryPerformanceChart', {
      type: 'bar',
      data: {
        labels: categories,
        datasets: [{
          label: 'Performance par Catégorie',
          data: performanceData,
          backgroundColor: 'rgba(54, 162, 235, 0.7)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Performance par Catégorie'
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  onKpiClick(title: string): void {
    console.log(`KPI clicked: ${title}`);
    // In a real app, you would navigate to a detailed view
  }

  onTabChange(event: any): void {
    console.log('Tab changed to:', event.tab.textLabel);
  }

  handleQuickAction(action: string): void {
    console.log('Action:', action);
    // In a real app, you would implement the actions
  }

  viewAllSales(): void {
    console.log('View all sales');
  }

  viewAllLowStock(): void {
    console.log('View all low stock items');
  }

  exportDashboardData(): void {
    this.loading = true;
    
    try {
      const doc = new jsPDF('landscape');
  
      // En-tête avec les informations de contact
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.setTextColor(40, 53, 147); 
      doc.text('QStocker', 15, 20);
  
      // Ligne séparatrice
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(15, 37, doc.internal.pageSize.width - 15, 37);
  
      // Titre principal centré
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(40, 40, 40);
      doc.text('Rapport Journalier - Tableau de Bord', 
             doc.internal.pageSize.width / 2, 45, { align: 'center' });
  
      // Date de génération alignée à droite
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(`Généré le: ${this.datePipe.transform(new Date(), 'dd/MM/yyyy à HH:mm', 'fr-FR')}`, 
             doc.internal.pageSize.width - 15, 45, { align: 'right' });
  
      // Section KPI
      autoTable(doc, {
        head: [['Indicateur', 'Valeur', 'Description', 'Tendance']],
        body: this.kpiCards.map(card => [
          card.title,
          card.isCurrency ? `${card.value.toFixed(2)} DT` : card.value,
          card.description,
          card.trend !== undefined ? `${card.trend > 0 ? '+' : ''}${card.trend}%` : 'N/A'
        ]),
        startY: 50,
        headStyles: {
          fillColor: [63, 81, 181],
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        }
      });
  
      // Section Ventes
      autoTable(doc, {
        head: [['N° Facture', 'Date', 'Montant', 'Paiement', 'Articles']],
        body: this.recentSales.map(sale => [
          sale.id,
          this.datePipe.transform(sale.date, 'dd/MM/yy HH:mm'),
          `${sale.amount.toFixed(2)} DT`,
          this.getPaymentMethodLabel(sale.paymentMethod),
          sale.items
        ]),
        startY: (doc as any).lastAutoTable.finalY + 15,
        headStyles: {
          fillColor: [56, 142, 60],
          textColor: 255,
          fontStyle: 'bold'
        }
      });
  
      // Section Stock Faible
      if (this.lowStockProducts.length > 0) {
        autoTable(doc, {
          head: [['Produit', 'Stock', 'Seuil', 'Prix Unitaire']],
          body: this.lowStockProducts.map(product => [
            product.nomProduit || 'Inconnu',
            product.quantite,
            product.seuil || 5,
            `${(product.prixUnitaireHT || 0).toFixed(2)} DT`
          ]),
          startY: (doc as any).lastAutoTable.finalY + 15,
          headStyles: {
            fillColor: [198, 40, 40],
            textColor: 255,
            fontStyle: 'bold'
          },
          willDrawCell: (data: any) => {
            if (data.column.index === 1 && data.cell.raw < data.row.raw[2]) {
              doc.setTextColor(198, 40, 40);
              doc.setFont('helvetica', 'bold');
            }
          }
        });
      }
  
      // Pied de page
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(
          `QStocker - Zone touristique Mahdia - contact.qstocker@gmail.com - Page ${i}/${pageCount}`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        );
      }
  
      doc.save(`QStocker_Rapport_${this.datePipe.transform(new Date(), 'yyyyMMdd', 'fr-FR')}.pdf`);
  
    } catch (error) {
      console.error('Erreur génération PDF:', error);
    } finally {
      this.loading = false;
    }
  }
  
  // Ajoutez cette méthode helper
  private getPaymentMethodLabel(method: string): string {
    const methods: Record<string, string> = {
      'cash': 'Espèces',
      'card': 'Carte',
      'credit': 'Crédit'
    };
    return methods[method] || method;
  }

  refreshDashboard(): void {
    this.loading = true;
    // Réinitialiser les graphiques
    if(this.salesTrendChart) this.salesTrendChart.destroy();
    if(this.productDistributionChart) this.productDistributionChart.destroy();
    
    // Réinitialiser les données
    this.kpiCards.forEach(card => card.value = 0);
    this.recentSales = [];
    this.lowStockProducts = [];
  
    // Recharger les données
    this.loadDashboardData();
  }

//modification jdiiida 
  async runAuthenticityCheck(): Promise<void> {
    this.loading = true;
    try {
      const result = await this.productService.checkProductsAuthenticity();
      this.authenticityStats = {
        verified: result.verifiedCount,
        suspicious: result.suspiciousCount,
        lastCheck: new Date(),
        verificationDetails: result.details
      };
      this.createAuthenticityChart(result.details);
    } catch (error) {
      console.error('Erreur de vérification:', error);
      this.activityService.logActivity('Échec de la vérification d\'authenticité');
    }
    this.loading = false;
  }

  private createAuthenticityChart(details: any): void {
    const ctx = document.getElementById('authenticityChart') as HTMLCanvasElement;
    if (!ctx) return;
  
    const chartCtx = ctx.getContext('2d');
    if (!chartCtx) return;
  
    if (this.authenticityChart) {
      this.authenticityChart.destroy();
    }
    this.authenticityChart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ['QR Code Valide', 'Consistance ML', 'Historique Stock', 'Localisation'],
        datasets: [{
          label: 'Scores d\'Authenticité',
          data: [
            details.qrValidationScore,
            details.mlConsistency,
            details.stockHistoryScore,
            details.locationScore
          ],
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgb(54, 162, 235)',
          pointBackgroundColor: 'rgb(54, 162, 235)',
        }]
      },
      options: {
        scales: {
          r: {
            beginAtZero: true,
            max: 100
          }
        }
      }
    });
  }
  async updateStockAnalysis(): Promise<void> {
    this.loading = true;
    try {
      const analysis = await this.stockService.predictStockAnalysis({
        period: parseInt(this.selectedPeriod)
      });
      
      this.stockMetrics = {
        predictedStockouts: analysis.predictedStockouts,
        stockoutTrend: analysis.trend,
        optimizationPotential: analysis.optimizationPotential,
        turnoverRate: analysis.turnoverRate
      };

      this.createStockPredictionChart(analysis.predictionData);
    } catch (error) {
      console.error('Erreur d\'analyse:', error);
    }
    this.loading = false;
  }

  private createStockPredictionChart(data: any[]): void {
    const canvas = document.getElementById('stockPredictionChart') as HTMLCanvasElement;
    if (!canvas) return;
  
    if (this.stockPredictionChart) {
      this.stockPredictionChart.destroy();
    }
    this.stockPredictionChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: data.map(d => new Date(d.date).toLocaleDateString()),
        datasets: [{
          label: 'Niveau de Stock Prédit',
          data: data.map(d => d.predictedStock),
          borderColor: 'rgb(255, 99, 132)',
          tension: 0.1
        }, {
          label: 'Demande Prévue',
          data: data.map(d => d.predictedDemand),
          borderColor: 'rgb(54, 162, 235)',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  loadStockData(): void {
    this.stockService.getStock().subscribe({
      next: stock => {
        this.lowStockProducts = stock.filter(item => item.quantite < item.seuil);
        this.kpiCards[2].value = this.lowStockProducts.length;
        
        // Calcul des nouvelles métriques
        this.stockMetrics = {
          ...this.stockMetrics,
          turnoverRate: this.calculateTurnoverRate(stock),
          optimizationPotential: this.calculateOptimizationPotential(stock)
        };
      },
      error: err => console.error('Erreur de chargement du stock:', err)
    });
  }
  private calculateTurnoverRate(stock: any[]): number {
    const totalValue = stock.reduce((sum, item) => sum + (item.quantite * item.prixUnitaireHT), 0);
    const monthlySales = this.monthlyRevenue;
    return monthlySales > 0 ? Math.round((totalValue / monthlySales) * 30) : 0;
  }

  private calculateOptimizationPotential(stock: any[]): number {
    return stock.reduce((sum, item) => {
      const idealStock = item.demandPrevue * 1.2;
      return sum + Math.max(0, item.quantite - idealStock) * item.prixUnitaireHT;
    }, 0);
  }

  viewSuspiciousProducts(): void {
    // Implémentation de la navigation ou de la logique
    console.log('Afficher les produits suspects');
  }


  filterActivities(type: string): void {
    this.filteredActivities = this.recentActivities.filter(activity => {
      return type === 'all' ? true : activity.type === type;
    });
  }

  getStockProgressColor(product: any): string {
    const percentage = (product.quantite / product.seuil) * 100;
    if (percentage <= 15) return 'warn';
    if (percentage <= 30) return 'accent';
    return 'primary';
  }

  
contactSupplier(supplier: any) {
  // Logique de contact
}

quickReplenish(product: any) {
  // Réapprovisionnement rapide
}

adjustSafetyStock(product: any) {
  // Ajustement du seuil
}
navigateToSupplierOrder() {
  this.router.navigate(['/commandes-fournisseur']);
}

generateReplenishmentOrder() {
  // Récupérer les produits sélectionnés si nécessaire
  const selectedProducts = this.lowStockProducts.filter(p => p.selected);
  
  // Passer les données via le state du router
  this.router.navigate(['/commandes-fournisseur'], {
    state: {
      products: selectedProducts,
      autoFill: true
    }
  });
}
}