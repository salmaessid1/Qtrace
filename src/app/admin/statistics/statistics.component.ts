import { Component, OnInit } from '@angular/core';
import { StockService } from '../../services/stock.service';
import { AngularFireDatabase } from '@angular/fire/compat/database';
import { SnapshotAction } from '@angular/fire/compat/database';
import { Chart, registerables } from 'chart.js';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-statistics',
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.css']
})
export class StatisticsComponent implements OnInit {
  stats: any = {
    totalUsers: 0,
    activeUsers: 0,
    pendingUsers: 0,
    totalProducts: 0,
    lowStockProducts: 0
  };

  topSellingPerfumes = [
    { name: 'Parfum A', sales: 120 },
    { name: 'Parfum B', sales: 95 },
    { name: 'Parfum C', sales: 80 },
    { name: 'Parfum D', sales: 75 },
  ];

  alerts = [
    { message: 'Rupture de stock pour le Parfum X', time: '10:45 AM' },
    { message: 'Contrefaçon détectée pour le Parfum Y', time: '11:30 AM' },
  ];

  isDarkMode = false;
  searchQuery = '';
  lowStockProducts: any[] = [];
  pendingUsers: any[] = [];
  calendarOptions!: CalendarOptions;
  calendarEvents: EventInput[] = [];

  constructor(
    private db: AngularFireDatabase,
    private stockService: StockService,
    private snackBar: MatSnackBar
  ) {
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.getStatistics();
    this.renderCharts();
    this.loadLowStockProducts();
    this.loadPendingUsers();
    this.initCalendar();
    this.loadCalendarEvents();
  }

  getStatistics(): void {
    this.db.list('users').snapshotChanges().subscribe((users: SnapshotAction<any>[]) => {
      this.stats.totalUsers = users.length;
      this.stats.activeUsers = users.filter(user => user.payload.val().status === 'approved').length;
      this.stats.pendingUsers = users.filter(user => user.payload.val().status === 'pending').length;
    });

    this.stockService.getStock().subscribe(stock => {
      this.stats.totalProducts = stock.length;
      this.stats.lowStockProducts = stock.filter(product => product.quantite < 10).length;
    });
  }

  loadLowStockProducts(): void {
    this.stockService.getStock().subscribe(stock => {
      this.lowStockProducts = stock
        .filter(product => product.quantite < 10)
        .map(product => ({
          id: product.idProduit,
          name: product.nomProduit,
          quantity: product.quantite
        }));
    });
  }

  loadPendingUsers(): void {
    this.db.list('users').snapshotChanges().subscribe((users: SnapshotAction<any>[]) => {
      this.pendingUsers = users
        .map(user => ({ id: user.key, ...user.payload.val() }))
        .filter(user => user.status === 'pending');
    });
  }

  renderCharts(): void {
    const salesChart = new Chart('salesChart', {
      type: 'bar',
      data: {
        labels: ['Parfum A', 'Parfum B', 'Parfum C', 'Parfum D'],
        datasets: [{
          label: 'Ventes',
          data: [120, 95, 80, 75],
          backgroundColor: ['#36A2EB', '#FF6384', '#FFCE56', '#4BC0C0']
        }]
      }
    });

    this.stockService.getStock().subscribe(stock => {
      const inStock = stock.filter(item => item.quantite >= 10).length;
      const outOfStock = stock.filter(item => item.quantite < 10).length;

      const stockChart = new Chart('stockChart', {
        type: 'pie',
        data: {
          labels: ['En Stock', 'En Rupture'],
          datasets: [{
            label: 'Stocks',
            data: [inStock, outOfStock],
            backgroundColor: ['#36A2EB', '#FF6384']
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'top',
            },
            title: {
              display: true,
              text: 'Répartition des Stocks'
            }
          }
        }
      });
    });
  }

  initCalendar(): void {
    this.calendarOptions = {
      plugins: [dayGridPlugin],
      initialView: 'dayGridMonth',
      events: this.calendarEvents,
      eventClick: this.handleEventClick.bind(this),
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,dayGridWeek,dayGridDay'
      },
      eventDisplay: 'block',
      eventColor: '#4CAF50',
      eventTextColor: '#ffffff'
    };
  }

  loadCalendarEvents(): void {
    this.db.list('events').valueChanges().subscribe((events: any[]) => {
      this.calendarEvents = events;
      this.calendarOptions.events = this.calendarEvents;
      this.snackBar.open('Calendrier mis à jour', 'Fermer', { duration: 2000 });
    });
  }

  handleEventClick(info: any): void {
    this.snackBar.open(`Événement: ${info.event.title} - ${info.event.startStr}`, 'Fermer', { duration: 3000 });
  }

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    document.body.classList.toggle('dark-theme', this.isDarkMode);
  }

  onSearch(): void {
    console.log('Recherche:', this.searchQuery);
  }
}