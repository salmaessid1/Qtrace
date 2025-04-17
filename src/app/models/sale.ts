// sale.model.ts
export interface SaleItem {
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    imageUrl?: string | null;
  }
  
  export interface Sale {
    id: string;
    invoiceNumber: string;
    items: SaleItem[];
    subTotal: number;
    discount: number;
    discountAmount: number;
    totalAmount: number;
    paymentMethod: string;
    customerId?: string;
    userId: string;
    date: string;
  }
  
  // stock-item.model.ts
  export interface StockItem {
    idProduit: string;
    nomProduit: string;
    quantite: number;
    prixUnitaireHT: number;
    prixDeVente: number;
    dateMiseAJour: string;
    historiquePrix?: Array<{
      date: string;
      prix: number;
      quantiteAjoutee: number;
    }>;
    qrCode?: string | null;  
    imageUrl?: string | null;
    description?: string | null;
  }