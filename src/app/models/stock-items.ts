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

  description?: string | null;
  editingPrice?: boolean;
  originalPrice?: number;
  seuil: number;
  qrCode?: string | null;
  imageUrl?: string | null;

}