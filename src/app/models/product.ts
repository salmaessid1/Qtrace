export interface Product {
  id: string;
  name: string;
  type: string;
  category: string;
  description: string;
  qrCode: string;
  imageUrl: string;
  unitPrice: number;
  costPrice: number;
  volume: string;
  stockQuantity: number;
  manufactureDate: string;
  status: 'active' | 'inactive' | 'promotion';
  createdAt: string;
  updatedAt?: string; 

}