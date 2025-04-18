import { Injectable } from '@angular/core';
import emailjs from 'emailjs-com';
import {  Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AngularFireDatabase } from '@angular/fire/compat/database';  // Utilisation de la bonne version de AngularFireDatabase
import { Commande } from '../models/commande';
interface BatchNumberGenerationConfig {
  prefix?: string;
  dateFormat?: string;
  randomDigits?: number;
}
@Injectable({
  providedIn: 'root'
})
export class EmailService {
  private emailServiceId = 'service_tx2l5pc';
  private emailTemplateId = 'template_k0yishm';
  private emailUserId = 'LKPl8oSC80IDn7FO2';
  private historiquePath = '/historique-commandes';  // Chemin de stockage des commandes dans Firebase

  constructor(private db: AngularFireDatabase) {}

  /**
   * Envoie un email de confirmation de commande via EmailJS.
   * @param order - La commande à envoyer par email.
   */
  sendEmail(order: any) {
    // Vérification que l'email du fournisseur est présent
    if (!order.supplierEmail) {
      console.error("❌ L'email du fournisseur est manquant !");
      return;
    }

    // Préparation des paramètres d'email
    const emailParams = {
      to_email: order.supplierEmail,
      to_name: order.supplierName,
      order_id: order.id,
      product_id: order.idProduit,
      product_name: order.productName,
      product_volume: order.productVolume, 
      quantity: order.quantity,
      unit_price: `${order.unitPrice} DT`,
      total_ht: `${order.totalHT.toFixed(2)} DT`,
      total_ttc: `${order.totalTTC.toFixed(2)} DT`,
      delivery_date: new Date(order.deliveryDate).toLocaleDateString('fr-FR'),
      order_date: new Date(order.dateCommande).toLocaleDateString('fr-FR'),
      company_name: 'QStocker',
      batch_number: order.batchNumber || 'N/A', 
    };
    
    emailjs.send(this.emailServiceId, this.emailTemplateId, emailParams, this.emailUserId)
      .then(() => {
        console.log("✅ Email envoyé avec succès !");
      })
      .catch(error => {
        console.error("❌ Erreur lors de l'envoi de l'email :", error);
      });
    

    // Envoi de l'email via EmailJS
    emailjs.send(this.emailServiceId, this.emailTemplateId, emailParams, this.emailUserId)
      .then(() => console.log(`📧 Email envoyé à ${order.supplierEmail}`))
      .catch(error => console.error('❌ Erreur EmailJS:', error));
  }
  generateBatchNumber(config?: BatchNumberGenerationConfig): string {
    const {
      prefix = 'LOT',
      dateFormat = 'YYMMDD',
      randomDigits = 4
    } = config || {};

    const now = new Date();
    let datePart = '';

    switch(dateFormat) {
      case 'YYMMDD':
        datePart = now.toISOString().slice(2, 10).replace(/-/g, '');
        break;
      case 'DDMMYYYY':
        datePart = [
          now.getDate().toString().padStart(2, '0'),
          (now.getMonth() + 1).toString().padStart(2, '0'),
          now.getFullYear()
        ].join('');
        break;
      default:
        datePart = now.getTime().toString();
    }

    const randomMax = Math.pow(10, randomDigits);
    const randomPart = Math.floor(randomMax / 10 + Math.random() * (randomMax - randomMax / 10));

    return `${prefix}-${datePart}-${randomPart}`;
  }
  /**
   * Récupère toutes les commandes de l'historique depuis Firebase.
   * @returns Observable de toutes les commandes de l'historique.
   */
  getCommandes(params?: { period: string }): Observable<Commande[]> {
    return this.db.list(this.historiquePath).snapshotChanges().pipe(
      map((changes: any[]) => 
        changes.map(c => ({ 
          key: c.payload.key, 
          ...c.payload.val() 
        }))
      )
    );
  }
  /**
   * Ajoute une commande à l'historique des commandes dans Firebase Realtime Database.
   * @param commande - La commande à ajouter.
   * @returns Promise résolue une fois l'ajout terminé.
   */
  ajouterCommandeHistorique(commande: any): Promise<void> {
    // Ajouter la clé Firebase à la commande
    const newCommande = {
      ...commande,
      key: this.db.createPushId() // Génère une clé unique
    };
  
    return this.db.list(this.historiquePath).set(newCommande.key, newCommande)
      .then(() => {
        console.log("✅ Commande ajoutée avec ID:", newCommande.key);
        this.sendEmail(newCommande);
      });
  }

  // Ajouter une méthode de mise à jour
  updateCommande(commandeKey: string, updateData: any): Promise<void> {
    return this.db.object(`/historique-commandes/${commandeKey}`).update(updateData);
}
  
  deleteCommande(idCommande: string): Promise<void> {
    return this.db.object(`${this.historiquePath}/${idCommande}`).remove();
  }

}
