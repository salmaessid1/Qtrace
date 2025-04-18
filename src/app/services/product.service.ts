import { Injectable } from '@angular/core';
import { AngularFireDatabase } from '@angular/fire/compat/database';
import { Observable, firstValueFrom, from, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Product } from '../models/product';
import { StockItem } from './stock.service';
import { of } from 'rxjs';

@Injectable({
  providedIn: 'root' // Assurez-vous que cette ligne est présente
})
export class ProductService {
  private dbPath = '/products';
  stockPath: any;

  constructor(private db: AngularFireDatabase) {}

async addProduct(product: Product): Promise<void> {
  try {
    // Validation
    if (!/^PRD-\d{3,5}$/i.test(product.id)) {
      throw new Error('Format ID invalide (ex: PRD-1234)');
    }

    const formattedId = product.id.toUpperCase().trim();
    const ref = this.db.database.ref(`${this.dbPath}/${formattedId}`);
    const snapshot = await ref.once('value');

    if (snapshot.exists()) {
      throw new Error('ID déjà utilisé');
    }

    await ref.set({
      ...product,
      id: formattedId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    throw new Error(`Échec de l'ajout: ${(error as Error).message}`);
  }
}

async productExists(productId: string): Promise<boolean> {
  const product = await firstValueFrom(
    this.db.object(`/products/${productId}`).valueChanges()
  );
  return !!product;
} 
  // Récupérer tous les produits
  getProducts(): Observable<Product[]> {
    return this.db.list<Product>(this.dbPath).snapshotChanges().pipe(
      map(snapshot => 
        snapshot.map(c => ({
          ...(c.payload.val() as Product),
          id: c.payload.key || '' // Assurez-vous que la clé (ID) est incluse
        }))
      ),
      catchError(error => {
        console.error('Erreur Firebase:', error);
        return throwError(() => new Error('Erreur de chargement des produits'));
      })
    );
  }

  // Récupérer un produit par ID
  getProductById(id: string): Observable<Product> {
    return this.db.object<Product>(`${this.dbPath}/${id}`).valueChanges().pipe(
      map(product => {
        if (!product) {
          throw new Error('Produit non trouvé');
        }
        return { ...product, id }; // Important: inclure l'ID
      }),
      catchError(error => {
        console.error('Erreur:', error);
        return throwError(() => error);
      })
    );
  }


  async updateProduct(id: string, product: Partial<Product>): Promise<void> {
    try {
      if (!id) throw new Error('ID produit manquant');
      
      const updateData = {
        ...product,
        updatedAt: new Date().toISOString()
      };

      await this.db.database.ref(`${this.dbPath}/${id}`).update(updateData);
      
    } catch (error) {
      console.error('Erreur Firebase:', error);
      throw new Error(`Échec de la mise à jour: ${(error as Error).message}`);
    }
  }
  
  // Supprimer un produit
  deleteProduct(productId: string): Promise<void> {
    return this.db.list(this.dbPath).remove(productId);
  }

  checkProductsAuthenticity(): Promise<any> {
    return Promise.resolve({
      verifiedCount: 0,
      suspiciousCount: 0,
      details: {
        qrValidationScore: 0,
        mlConsistency: 0,
        stockHistoryScore: 0,
        locationScore: 0
      }
    });
}}