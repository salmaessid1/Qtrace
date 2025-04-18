import { Injectable } from '@angular/core';
import { AngularFireDatabase } from '@angular/fire/compat/database';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Sale, SaleItem } from '../models/sale';
import { StockService } from './stock.service';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class SaleService {
  private dbPath = '/sales';
  private lastInvoiceNumber = 0;

  constructor(
    private db: AngularFireDatabase,
    private stockService: StockService,
    private http: HttpClient,
  ) {}

  private async updateStockQuantities(items: SaleItem[]): Promise<void> {
    const updates = items.map(item => 
      this.stockService.updateStockQuantity(item.productId, -item.quantity)
    );
    await Promise.all(updates);
  }

getSalesHistory(period: string): Observable<Sale[]> {
  return this.db.list<Sale>(this.dbPath, ref => {
    let query = ref.orderByChild('date');
    const now = new Date();
    
    switch(period) {
      case 'today':
        const startOfDay = new Date();
        startOfDay.setHours(0,0,0,0);
        return query.startAt(startOfDay.toISOString())
                    .endAt(now.toISOString());
      
      case 'week':
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - 7);
        return query.startAt(startOfWeek.toISOString())
                    .endAt(now.toISOString());
      
      case 'month':
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0,0,0,0);
        return query.startAt(startOfMonth.toISOString());
      
      default:
        return query;
    }
  }).valueChanges().pipe(
    map(sales => sales.filter(s => !!s)), // Filtre les valeurs null
    tap(sales => console.log('Ventes récupérées:', sales)) // Debug
  );
}

  getSalesByDateRange(startDate: string, endDate: string): Observable<Sale[]> {
    return this.db.list<Sale>(this.dbPath, ref => 
      ref.orderByChild('date')
         .startAt(startDate)
         .endAt(endDate)
    ).valueChanges().pipe(
      tap((sales: Sale[]) => console.log('Ventes récupérées:', sales)),
      map((sales: Sale[]) => sales.filter((sale: Sale) => 
        new Date(sale.date) >= new Date(startDate) && 
        new Date(sale.date) <= new Date(endDate)
      ))
    );
  }

  getAllSales(): Observable<Sale[]> {
    return this.db.list<Sale>(this.dbPath).valueChanges().pipe(
      map((sales: Sale[]) => sales.sort((a: Sale, b: Sale) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()))
    );
  }

  generateInvoiceNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    
    this.lastInvoiceNumber++;
    const sequence = this.lastInvoiceNumber.toString().padStart(4, '0');
    
    return `FAC-${year}${month}${day}-${sequence}`;
  }

  async createSale(saleData: Omit<Sale, 'id'>): Promise<Sale> {
    const newSale: Sale = {
      ...saleData,
      id: this.db.createPushId(),
      invoiceNumber: this.generateInvoiceNumber(),
      date: new Date().toISOString()
    };

    await this.db.list(this.dbPath).push(newSale);
    return newSale;
  }
  
}