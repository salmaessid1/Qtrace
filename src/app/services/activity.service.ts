import { Injectable } from '@angular/core';
import { of } from 'rxjs';

interface Activity {
  icon: string;
  message: string;
  time: string | Date;
}

@Injectable({
  providedIn: 'root'
})
export class ActivityService {
  private activities: Activity[] = [
    {
      icon: 'shopping_cart',
      message: 'Nouvelle vente enregistrée - REF-12345',
      time: new Date()
    },
    {
      icon: 'inventory',
      message: 'Stock mis à jour - Produit ABC',
      time: new Date(Date.now() - 1000 * 60 * 30) // 30 minutes ago
    },
    {
      icon: 'warning',
      message: 'Alerte stock bas - Produit XYZ',
      time: new Date(Date.now() - 1000 * 60 * 120) // 2 hours ago
    },
    {
      icon: 'person_add',
      message: 'Nouveau client enregistré',
      time: new Date(Date.now() - 1000 * 60 * 60 * 5) // 5 hours ago
    },
    {
      icon: 'update',
      message: 'Mise à jour système effectuée',
      time: new Date(Date.now() - 1000 * 60 * 60 * 24) // 1 day ago
    }
  ];

  constructor() {}

  getRecentActivities() {
    // Retourne les activités triées par date (les plus récentes en premier)
    return of([...this.activities].sort((a, b) => 
      new Date(b.time).getTime() - new Date(a.time).getTime()
    ));
  }

  logActivity(message: string) {
    const newActivity: Activity = {
      icon: 'info',
      message,
      time: new Date()
    };
    this.activities.unshift(newActivity); // Ajoute au début du tableau
    console.log('Activité enregistrée:', message);
  }
}