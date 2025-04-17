import { Injectable } from '@angular/core';
import emailjs from 'emailjs-com';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AngularFireDatabase } from '@angular/fire/compat/database';
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
  private emailServiceId = 'service_vl12chd';
  private emailTemplateId = 'template_8o5ryuu';
  private emailUserId = 'BH9KaqS3o-UnguAVb';
  private historiquePath = '/historique-commandes';

  constructor(private db: AngularFireDatabase) {}

  sendEmail(order: any) {
    if (!order.supplierEmail) {
      console.error("❌ L'email du fournisseur est manquant !");
      return;
    }

    const emailParams = {
      to_email: order.supplierEmail,
      to_name: order.supplierName,
      order_id: order.idCommande, 
      product_id: order.idProduit,
      quantity: order.quantity,
      unit_price: order.unitPrice,
      total_ht: order.totalHT,
      total_ttc: order.totalTTC,
      delivery_date: order.deliveryDate,
      order_date: order.dateCommande,
      company_name: 'Qtrace',
      concentration: 'Eau de Parfum', 
      size: 100, 
      batch_number: this.generateBatchNumber(),
      current_year: new Date().getFullYear(),
      prefix: 'PARFUM',
      randomDigits: 5,
    };

    console.log("📩 Envoi de l'email avec les paramètres :", emailParams);

    emailjs.send(this.emailServiceId, this.emailTemplateId, emailParams, this.emailUserId)
      .then(() => console.log(`📧 emailjs envoyé à ${order.supplierEmail}`))
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

  ajouterCommandeHistorique(commande: any): Promise<void> {
    const newCommande = {
      ...commande,
      key: this.db.createPushId()
    };
  
    return this.db.list(this.historiquePath).set(newCommande.key, newCommande)
      .then(() => {
        console.log("✅ Commande ajoutée avec ID:", newCommande.key);
        this.sendEmail(newCommande);
      });
  }

  updateCommande(commandeKey: string, updateData: any): Promise<void> {
    return this.db.object(`/historique-commandes/${commandeKey}`).update(updateData);
  }
  
  deleteCommande(idCommande: string): Promise<void> {
    return this.db.object(`${this.historiquePath}/${idCommande}`).remove();
  }
}