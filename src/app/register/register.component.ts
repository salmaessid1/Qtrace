import { Component } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { AngularFireDatabase } from '@angular/fire/compat/database';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  email: string = '';
  password: string = '';
  loading: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private db: AngularFireDatabase
  ) {}

  async register() {
    if (!this.email || !this.password) {
      alert("❌ Veuillez entrer un email et un mot de passe.");
      return;
    }

    this.loading = true;
    try {
      const userCredential = await this.authService.register(this.email, this.password);
      if (!userCredential) {
        throw new Error("❌ Échec de l'inscription.");
      }

      const uid = userCredential.uid;
      
      // ✅ Ajout du responsable dans Firebase Database
      await this.db.object(`users/${uid}`).set({
        email: this.email,
        role: 'responsable',
        status: 'pending' // En attente d'approbation par l'admin
      });

      alert("✅ Compte créé avec succès ! En attente d'approbation.");
      this.router.navigate(['/']);  
    } catch (error: any) {
      alert(`❌ Erreur : ${error.message}`);
    } finally {
      this.loading = false;
    }
  }

  goToLogin() {
    this.router.navigate(['/']);
  }
}
