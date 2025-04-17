import { Component, OnInit } from '@angular/core';
import { AngularFireDatabase } from '@angular/fire/compat/database';
import { SnapshotAction } from '@angular/fire/compat/database';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  pendingUsers: any[] = []; // Utilisateurs en attente d'approbation
  products: any[] = []; // Liste des produits
  roles: any[] = []; // Liste des rôles
  stockHistory: any[] = []; // Historique des stocks
  stats: any = { // Statistiques globales
    totalUsers: 0,
    activeUsers: 0,
    pendingUsers: 0,
    totalProducts: 0,
    lowStockProducts: 0
  };

  constructor(private db: AngularFireDatabase) {}
  ngOnInit() {
    this.getPendingUsers(); // Récupérer les utilisateurs en attente
    this.getStatistics(); // Récupérer les statistiques
    this.getProducts(); // Récupérer les produits
    this.getRoles(); // Récupérer les rôles
    this.getStockHistory(); // Récupérer l'historique des stocks
  }

  // Récupérer les utilisateurs en attente
  getPendingUsers() {
    this.db.list('users', ref => ref.orderByChild('status').equalTo('pending'))
      .snapshotChanges()
      .subscribe((users: SnapshotAction<any>[]) => {
        this.pendingUsers = users.map(user => {
          const userData = user.payload.val() as any;
          return { uid: user.key, ...userData };
        });
        this.stats.pendingUsers = this.pendingUsers.length; // Mettre à jour les statistiques
      });
  }

  // Récupérer les statistiques globales
  getStatistics() {
    this.db.list('users').snapshotChanges().subscribe((users: SnapshotAction<any>[]) => {
      this.stats.totalUsers = users.length;
      this.stats.activeUsers = users.filter(user => user.payload.val().status === 'approved').length;
    });

    this.db.list('products').snapshotChanges().subscribe((products: SnapshotAction<any>[]) => {
      this.stats.totalProducts = products.length;
      this.stats.lowStockProducts = products.filter(product => product.payload.val().quantity < 10).length;
    });
  }

  // Récupérer la liste des produits
  getProducts() {
    this.db.list('products').snapshotChanges().subscribe((products: SnapshotAction<any>[]) => {
      this.products = products.map(product => {
        const productData = product.payload.val() as any;
        return { id: product.key, ...productData };
      });
    });
  }

  // Récupérer la liste des rôles
  getRoles() {
    this.db.list('roles').snapshotChanges().subscribe((roles: SnapshotAction<any>[]) => {
      this.roles = roles.map(role => {
        const roleData = role.payload.val() as any;
        return { id: role.key, ...roleData };
      });
    });
  }

  // Récupérer l'historique des stocks
  getStockHistory() {
    this.db.list('stockHistory').snapshotChanges().subscribe((history: SnapshotAction<any>[]) => {
      this.stockHistory = history.map(record => {
        const recordData = record.payload.val() as any;
        return { id: record.key, ...recordData };
      });
    });
  }

  // Approuver un utilisateur
  approveUser(uid: string) {
    this.db.object(`users/${uid}/status`).set('approved').then(() => {
      alert("✅ Utilisateur approuvé !");
    }).catch(error => alert(`❌ Erreur : ${error.message}`));
  }

  // Refuser un utilisateur
  rejectUser(uid: string) {
    this.db.object(`users/${uid}`).remove().then(() => {
      alert("❌ Utilisateur supprimé !");
    }).catch(error => alert(`❌ Erreur : ${error.message}`));
  }

  // Modifier un produit (accès limité pour l'admin)
  updateProduct(productId: string, newData: any) {
    this.db.object(`products/${productId}`).update(newData).then(() => {
      alert("✅ Produit mis à jour !");
    }).catch(error => alert(`❌ Erreur : ${error.message}`));
  }


  
}