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
    this.loadStockAndHistory();
  }

  loadStockAndHistory(): void {
    // Utilisez getStockMovements() au lieu de getStockHistory()
    this.stockService.getStockMovements().subscribe(history => {
      this.stockHistory = history.map(item => ({
        idProduit: item.productId || '-',
        nomProduit: item.productName,
        quantite: item.quantity,
        prixUnitaireHT: null,
        valeurTotale: null,
        dateMiseAJour: item.date,
        type: 'history',
      }));
      this.combineData();
    });

    this.stockService.getStock().subscribe(stock => {
      this.currentStock = stock.map(item => ({
        idProduit: item.idProduit || '-',
        nomProduit: item.nomProduit,
        quantite: item.quantite,
        prixUnitaireHT: item.prixUnitaireHT,
        valeurTotale: item.prixUnitaireHT * item.quantite,
        dateMiseAJour: item.dateMiseAJour,
        type: 'stock',
      }));
      this.combineData();
    });
  }

  combineData(): void {
    if (this.stockHistory && this.currentStock) {
      const combinedMap = new Map<string, any>();
      
      this.stockHistory.forEach(record => {
        const key = record.idProduit;
        if (!combinedMap.has(key)) {
          combinedMap.set(key, record);
        }
      });

      this.currentStock.forEach(record => {
        const key = record.idProduit;
        combinedMap.set(key, record);
      });

      this.combinedData = Array.from(combinedMap.values())
        .sort((a, b) => new Date(b.dateMiseAJour).getTime() - new Date(a.dateMiseAJour).getTime());
    }
  }
}