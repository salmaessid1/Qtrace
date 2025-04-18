export interface Expense {
    id: string;
    date: string; // ISO date string
    amount: number;
    category: string;
    description: string;
    paymentMethod: 'cash' | 'card' | 'transfer' | 'check';
    supplier?: string;
    userId?: string;
  }