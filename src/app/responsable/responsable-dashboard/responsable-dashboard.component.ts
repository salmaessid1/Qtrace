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

@Component({
  selector: 'app-responsable-dashboard',
  templateUrl: './responsable-dashboard.component.html',
  styleUrls: ['./responsable-dashboard.component.css'],
  providers: [DatePipe]
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
      icon: 'euro',
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
      isCurrency: false
    }
  ];

  salesTrendChart: any;
  productDistributionChart: any;
  categoryPerformanceChart: any;

  monthlyRevenue = 0;
  monthlySales = 0;
  averageTicket = 0;
  revenueTrend = 0;
  salesTrend = 0;
  ticketTrend = 0;

  recentSales: RecentSale[] = [];
  displayedColumns: string[] = ['id', 'date', 'amount', 'paymentMethod', 'items'];

  lowStockProducts: any[] = [];

  quickActions = [
    { icon: 'add', label: 'Nouvelle vente', action: 'newSale', color: 'primary' },
    { icon: 'exit_to_app', label: 'Nouvelle sortie', action: 'newExit', color: 'accent' },
    { icon: 'inventory_2', label: 'Réapprovisionner', action: 'replenish', color: 'warn' },
    { icon: 'notifications', label: 'Alertes', action: 'alerts', color: 'warn' },
    { icon: 'bar_chart', label: 'Rapports', action: 'reports', color: 'primary' }
  ];

  recentActivities: Activity[] = [];

  constructor(
    private saleService: SaleService,
    private stockService: StockService,
    private productService: ProductService,
    private activityService: ActivityService,
    private datePipe: DatePipe
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
    this.loadRecentActivities();
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

    this.saleService.getSalesByDateRange(startOfDay, endOfDay).subscribe({
      next: sales => {
        this.kpiCards[0].value = sales.length;
        const todayRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        this.kpiCards[3].value = todayRevenue;
        const profit = todayRevenue * 0.3;
        this.kpiCards[4].value = profit;
        
        this.recentSales = sales.map(sale => ({
          id: sale.invoiceNumber,
          date: sale.date,
          amount: sale.totalAmount,
          paymentMethod: sale.paymentMethod,
          items: sale.items.reduce((sum, item) => sum + item.quantity, 0)
        })).slice(0, 5);

        this.calculateDailyTrends();
      },
      error: err => {
        console.error('Error loading sales data:', err);
        this.loading = false;
      }
    });

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    this.saleService.getSalesByDateRange(startOfWeek.toISOString(), new Date().toISOString())
      .subscribe(sales => {
        this.createSalesTrendChart(sales);
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
        this.calculateMonthlyTrends();
        this.loading = false;
      });
  }

  loadRecentActivities(): void {
    this.activityService.getRecentActivities().subscribe(activities => {
      this.recentActivities = activities.map(activity => ({
        ...activity,
        time: new Date(activity.time)
      })).slice(0, 5);
    });
  }

  calculateDailyTrends(): void {
    this.kpiCards[0].trend = this.getRandomTrend();
    this.kpiCards[0].comparisonValue = Math.floor(Math.random() * 10);
    this.kpiCards[1].trend = this.getRandomTrend();
    this.kpiCards[3].trend = this.getRandomTrend();
    this.kpiCards[3].comparisonValue = Math.random() * 500;
    this.kpiCards[4].trend = this.getRandomTrend();
    this.kpiCards[5].value = Math.floor(Math.random() * 10);
    this.kpiCards[5].trend = this.getRandomTrend();
  }

  calculateMonthlyTrends(): void {
    this.revenueTrend = this.getRandomTrend();
    this.salesTrend = this.getRandomTrend();
    this.ticketTrend = this.getRandomTrend();
  }

  getRandomTrend(): number {
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
      return categoryProducts.length * 100;
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
  }

  onTabChange(event: any): void {
    console.log('Tab changed to:', event.tab.textLabel);
  }

  handleQuickAction(action: string): void {
    console.log('Action:', action);
  }

  viewAllSales(): void {
    console.log('View all sales');
  }

  viewAllLowStock(): void {
    console.log('View all low stock items');
  }

  exportDashboardData(): void {
    console.log('Exporting dashboard data');
  }

  refreshDashboard(): void {
    this.loadDashboardData();
    this.activityService.logActivity('Dashboard actualisé manuellement');
  }

  async runAuthenticityCheck(): Promise<void> {
    this.loading = true;
    try {
      const result = await this.productService.checkProductsAuthenticity();
      if (result) { // Vérifiez que result n'est pas undefined
        this.authenticityStats = {
          verified: result.verifiedCount,
          suspicious: result.suspiciousCount,
          lastCheck: new Date(),
          verificationDetails: result.details
        };
        this.createAuthenticityChart(result.details);
      }
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
    console.log('Afficher les produits suspects');
  }
}