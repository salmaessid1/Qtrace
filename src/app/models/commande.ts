export interface Commande {
  client: any;
    idCommande: string;
    dateCommande: string;
    supplierName: string;
    supplierEmail: string;
    productName: string;
    productId?: string;
    quantite: number;
    prixUnitaire: number;
    totalHT: number;
    totalTTC: number;
    shortId: string;
    dateLivraison?: Date;
    montant: number;
    latitude?: number;
    longitude?: number;
    status: 'En attente' | 'En cours' | 'Livré' | 'Annulé';
    id: string;
    firebaseId: string;       
    customIdCommande: string; 
    idProduit: string;       
  }