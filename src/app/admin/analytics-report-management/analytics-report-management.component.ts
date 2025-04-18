import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { Chart, ChartType, ChartDataset, registerables } from 'chart.js';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';
import { debounceTime, Subject, Subscription, Observable, combineLatest } from 'rxjs';
import { NotificationService, Notification } from 'src/app/services/notification.service';
import { Report, ReportType, ReportData } from 'src/app/models/report';
import { UserService } from '../../services/user.service';
import { StockService } from '../../services/stock.service';
import { SaleService } from '../../services/sale.service';

Chart.register(...registerables);

@Component({
  selector: 'app-analytics-report-management',
  templateUrl: './analytics-report-management.component.html',
  styleUrls: ['./analytics-report-management.component.css'],
})
export class AnalyticsReportManagementComponent implements OnInit, OnDestroy {
  ngOnDestroy(): void {
    throw new Error('Method not implemented.');
  }
  ngOnInit(): void {
    throw new Error('Method not implemented.');
  }
}