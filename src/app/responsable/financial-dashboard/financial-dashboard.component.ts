import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { SaleService } from '../../services/sale.service';
import { StockService } from '../../services/stock.service';
import { ExpenseService } from '../../services/expense.service';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { 
  startOfDay, endOfDay, startOfWeek, endOfWeek, 
  startOfMonth, endOfMonth, startOfYear, endOfYear, 
  subMonths, parseISO, isWithinInterval, format 
} from 'date-fns';
import { combineLatest, Subscription, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-financial-dashboard',
  templateUrl: './financial-dashboard.component.html',
  styleUrls: ['./financial-dashboard.component.css']
})
export class FinancialDashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  private subscriptions = new Subscription();
  private lineChart?: Chart<'line', number[], string>;
  private doughnutChart?: Chart<'doughnut', number[], string>;

  // Data
  sales: any[] = [];
  stock: any[] = [];
  filteredSales: any[] = [];
  previousPeriodSales: any[] = [];
  expenses: any[] = [];
  filteredExpenses: any[] = [];

  // Metrics
  totalCA = 0;
  totalCost = 0;
  benefice = 0;
  panierMoyen = 0;
  transactions = 0;
  margeBrute = 0;
  costPerTransaction = 0;
  caTrend = 0;
  totalExpenses = 0;

  // UI States
  errorMessage: string | null = null;
  showExpensesSection = false;
  showExpenseModal = false;
  expensesLoading = false;
  addingExpense = false;

  // New Expense
  newExpense: any = {
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: 0,
    category: '',
    description: '',
    paymentMethod: 'Carte'
  };

  // Categories
  expenseCategories = [
    'Fournitures',
    'Loyer',
    'Salaires',
    'Services',
    'Marketing',
    'Transport',
    'Équipement',
    'Autres'
  ];

  // Filters
  period = 'month';
  customStart: string = '';
  customEnd: string = '';

  constructor(
    private saleService: SaleService,
    private stockService: StockService,
    private expenseService: ExpenseService
  ) {
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.loadInitialData();
  }

  ngAfterViewInit(): void {
    this.initCharts();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.destroyCharts();
  }

  toggleExpensesSection(): void {
    this.showExpensesSection = !this.showExpensesSection;
    if (this.showExpensesSection && this.expenses.length === 0) {
      this.loadExpenses();
    }
  }

  openExpenseModal(): void {
    this.showExpenseModal = true;
  }

  closeExpenseModal(): void {
    this.showExpenseModal = false;
    this.newExpense = {
      date: format(new Date(), 'yyyy-MM-dd'),
      amount: 0,
      category: '',
      description: '',
      paymentMethod: 'Carte'
    };
  }

  submitExpense(): void {
    this.addingExpense = true;
    this.expenseService.addExpense(this.newExpense).then(() => {
      this.loadExpenses();
      this.closeExpenseModal();
    }).catch(error => {
      this.errorMessage = 'Erreur lors de l\'ajout de la dépense';
      console.error(error);
    }).finally(() => {
      this.addingExpense = false;
    });
  }

  deleteExpense(id: string): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette dépense ?')) {
      this.expenseService.deleteExpense(id).then(() => {
        this.loadExpenses();
      }).catch(error => {
        this.errorMessage = 'Erreur lors de la suppression';
        console.error(error);
      });
    }
  }

  getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      'Fournitures': 'info',
      'Loyer': 'warning',
      'Salaires': 'danger',
      'Services': 'primary',
      'Marketing': 'success',
      'Transport': 'secondary',
      'Équipement': 'dark',
      'Autres': 'light'
    };
    return colors[category] || 'secondary';
  }

  retryLoading(): void {
    this.loadInitialData();
    if (this.showExpensesSection) {
      this.loadExpenses();
    }
  }

  private loadInitialData(): void {
    this.errorMessage = null;

    const sales$ = this.saleService.getSalesHistory('all').pipe(
      catchError(err => {
        console.error('Erreur sales:', err);
        return of([]);
      })
    );

    const stock$ = this.stockService.getStock().pipe(
      catchError(err => {
        console.error('Erreur stock:', err);
        return of([]);
      })
    );

    this.subscriptions.add(
      combineLatest([sales$, stock$]).subscribe({
        next: ([sales, stock]) => {
          this.processData(sales, stock);
        },
        error: (err) => {
          console.error('Erreur:', err);
          this.errorMessage = 'Impossible de charger les données';
        }
      })
    );
  }

  private loadExpenses(): void {
    this.expensesLoading = true;
    this.expenseService.getExpenses().subscribe({
      next: (expenses) => {
        this.expenses = expenses;
        this.filterExpenses();
        this.calculateTotalExpenses();
        this.updateDoughnutChart();
        this.expensesLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Erreur lors du chargement des dépenses';
        console.error(error);
        this.expensesLoading = false;
      }
    });
  }

  private calculateTotalExpenses(): void {
    this.totalExpenses = this.filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  }

  private processData(sales: any[], stock: any[]): void {
    this.sales = Array.isArray(sales) ? sales : [];
    this.stock = Array.isArray(stock) ? stock : [];
    
    if (this.sales.length > 0 || this.stock.length > 0) {
      this.loadPreviousPeriodData();
      this.applyPeriodFilter();
      this.initCharts();
    } else {
      this.errorMessage = 'Aucune donnée disponible';
    }
  }

  private filterExpenses(): void {
    const { start, end } = this.getDateRange();
    this.filteredExpenses = this.expenses.filter(exp => {
      const expDate = new Date(exp.date);
      return isWithinInterval(expDate, { start, end });
    });
    this.calculateTotalExpenses();
  }

  private initCharts(): void {
    this.destroyCharts();
    this.updateLineChart();
    this.updateDoughnutChart();
  }

  private loadPreviousPeriodData(): void {
    try {
      const previousMonth = subMonths(new Date(), 1);
      const { start, end } = this.getDateRange(previousMonth);
      
      this.previousPeriodSales = this.sales.filter(s => {
        try {
          const saleDate = new Date(s.date);
          return isWithinInterval(saleDate, { start, end });
        } catch (e) {
          console.error('Erreur date:', e);
          return false;
        }
      });
    } catch (e) {
      console.error('Erreur période précédente:', e);
      this.previousPeriodSales = [];
    }
  }

  applyPeriodFilter(): void {
    try {
      const { start, end } = this.getDateRange();
      
      this.filteredSales = this.sales.filter(sale => {
        try {
          const saleDate = new Date(sale.date);
          return isWithinInterval(saleDate, { start, end });
        } catch (e) {
          console.error('Erreur filtre date:', e);
          return false;
        }
      });

      if (this.expenses.length > 0) {
        this.filterExpenses();
      }

      if (this.filteredSales.length === 0 && this.filteredExpenses.length === 0) {
        this.errorMessage = 'Aucune donnée pour cette période';
      } else {
        this.errorMessage = null;
      }

      this.calculateMetrics();
      this.updateCharts();
    } catch (e) {
      console.error('Erreur application filtre:', e);
      this.errorMessage = 'Erreur de filtrage';
    }
  }

  private getDateRange(referenceDate = new Date()): { start: Date; end: Date } {
    try {
      let start: Date;
      let end: Date;

      switch (this.period) {
        case 'today':
          start = startOfDay(referenceDate);
          end = endOfDay(referenceDate);
          break;
        case 'week':
          start = startOfWeek(referenceDate);
          end = endOfWeek(referenceDate);
          break;
        case 'month':
          start = startOfMonth(referenceDate);
          end = endOfMonth(referenceDate);
          break;
        case 'year':
          start = startOfYear(referenceDate);
          end = endOfYear(referenceDate);
          break;
        case 'custom':
          start = this.customStart ? parseISO(this.customStart) : new Date(0);
          end = this.customEnd ? endOfDay(parseISO(this.customEnd)) : new Date();
          break;
        default: // 'all'
          start = new Date(0);
          end = new Date();
      }

      return { start, end };
    } catch (e) {
      console.error('Erreur calcul période:', e);
      return { start: new Date(0), end: new Date() };
    }
  }

  private calculateMetrics(): void {
    try {
      this.transactions = this.filteredSales.length;
      this.totalCA = this.filteredSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
      this.totalCost = this.calculateTotalCost();
      this.benefice = this.totalCA - this.totalCost;
      this.margeBrute = this.totalCA > 0 ? (this.benefice / this.totalCA) * 100 : 0;
      this.panierMoyen = this.transactions > 0 ? this.totalCA / this.transactions : 0;
      this.costPerTransaction = this.transactions > 0 ? this.totalCost / this.transactions : 0;

      const previousCA = this.previousPeriodSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
      this.caTrend = previousCA > 0 ? ((this.totalCA - previousCA) / previousCA) * 100 : 0;
    } catch (e) {
      console.error('Erreur calcul métriques:', e);
      this.errorMessage = 'Erreur de calcul';
    }
  }

  private calculateTotalCost(): number {
    try {
      const costMap = new Map(
        this.stock.map(item => [item.idProduit, item.prixUnitaireHT])
      );

      return this.filteredSales.reduce((total, sale) => {
        return total + (sale.items?.reduce((sum: number, item: any) => {
          return sum + ((costMap.get(item.productId) || 0)) * (item.quantity || 0);
        }, 0) || 0);
      }, 0);
    } catch (e) {
      console.error('Erreur calcul coût:', e);
      return 0;
    }
  }

  private updateCharts(): void {
    this.updateLineChart();
    this.updateDoughnutChart();
  }

  private updateLineChart(): void {
    const ctx = document.getElementById('lineChart') as HTMLCanvasElement;
    if (!ctx) return;

    const dailyData = this.groupSalesByDay();
    
    if (this.lineChart) {
      this.lineChart.data.labels = dailyData.labels;
      this.lineChart.data.datasets[0].data = dailyData.values;
      this.lineChart.update();
    } else {
      const config: ChartConfiguration<'line', number[], string> = {
        type: 'line',
        data: {
          labels: dailyData.labels,
          datasets: [{
            label: 'Chiffre d\'affaires',
            data: dailyData.values,
            borderColor: '#4CAF50',
            backgroundColor: 'rgba(76, 175, 80, 0.2)',
            fill: true,
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top' },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const label = context.dataset.label || '';
                  const value = Number(context.raw) || 0;
                  return `${label}: ${value.toFixed(2)} DT`;
                }
              }
            }
          }
        }
      };
      
      this.lineChart = new Chart(ctx, config);
    }
  }

  private updateDoughnutChart(): void {
    const ctx = document.getElementById('doughnutChart') as HTMLCanvasElement;
    if (!ctx) return;

    const categories = this.showExpensesSection && this.filteredExpenses.length > 0 
      ? this.groupExpensesByCategory()
      : this.groupSalesByCategory();
    
    if (this.doughnutChart) {
      this.doughnutChart.data.labels = categories.labels;
      (this.doughnutChart.data.datasets[0].data as number[]) = categories.values;
      this.doughnutChart.update();
    } else {
      const config: ChartConfiguration<'doughnut', number[], string> = {
        type: 'doughnut',
        data: {
          labels: categories.labels,
          datasets: [{
            label: this.showExpensesSection ? 'Dépenses' : 'Répartition',
            data: categories.values,
            backgroundColor: [
              '#FF6384', '#36A2EB', '#FFCE56', 
              '#4BC0C0', '#9966FF', '#FF9F40',
              '#8AC24A', '#607D8B'
            ]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top' },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const label = context.label || '';
                  const value = context.parsed || 0;
                  const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
                  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                  return `${label}: ${value.toFixed(2)} DT (${percentage}%)`;
                }
              }
            }
          }
        }
      };
      
      this.doughnutChart = new Chart(ctx, config);
    }
  }

  private groupSalesByDay(): { labels: string[]; values: number[] } {
    const groupedData: Record<string, number> = {};

    this.filteredSales.forEach(sale => {
      try {
        const date = new Date(sale.date);
        const key = date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
        groupedData[key] = (groupedData[key] || 0) + (sale.totalAmount || 0);
      } catch (e) {
        console.error('Erreur groupage par jour:', e);
      }
    });

    return {
      labels: Object.keys(groupedData),
      values: Object.values(groupedData)
    };
  }

  private groupSalesByCategory(): { labels: string[]; values: number[] } {
    const categories: Record<string, number> = {};

    this.filteredSales.forEach(sale => {
      (sale.items || []).forEach((item: any) => {
        try {
          const category = this.determineCategory(item.productId);
          categories[category] = (categories[category] || 0) + (item.totalPrice || 0);
        } catch (e) {
          console.error('Erreur groupage catégorie:', e);
        }
      });
    });

    if (Object.keys(categories).length === 0) {
      return {
        labels: ['Aucune donnée'],
        values: [1]
      };
    }

    return {
      labels: Object.keys(categories),
      values: Object.values(categories)
    };
  }

  private groupExpensesByCategory(): { labels: string[]; values: number[] } {
    const categories: Record<string, number> = {};

    this.filteredExpenses.forEach(expense => {
      categories[expense.category] = (categories[expense.category] || 0) + expense.amount;
    });

    if (Object.keys(categories).length === 0) {
      return {
        labels: ['Aucune dépense'],
        values: [1]
      };
    }

    return {
      labels: Object.keys(categories),
      values: Object.values(categories)
    };
  }

  private determineCategory(productId: string): string {
    if (!productId) return 'Non catégorisé';
    
    const firstChar = productId.charAt(0).toUpperCase();
    switch(firstChar) {
      case 'A': return 'Alimentaire';
      case 'B': return 'Boissons';
      case 'C': return 'Cosmétiques';
      default: return 'Divers';
    }
  }

  private destroyCharts(): void {
    if (this.lineChart) {
      this.lineChart.destroy();
      this.lineChart = undefined;
    }
    if (this.doughnutChart) {
      this.doughnutChart.destroy();
      this.doughnutChart = undefined;
    }
  }
}