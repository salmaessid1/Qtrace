import { Component, OnInit } from '@angular/core';
import { StockService } from '../../services/stock.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-stock-history',
  templateUrl: './stock-history.component.html',
  styleUrls: ['./stock-history.component.css']
})
export class StockHistoryComponent implements OnInit {
  stockHistory: any[] = [];
  currentStock: any[] = [];
  combinedData: any[] = [];

  constructor(private stockService: StockService) {}

  ngOnInit(): void {
   
  }

}