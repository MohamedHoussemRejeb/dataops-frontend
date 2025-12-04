// src/app/features/auth/login.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { KeycloakService } from 'keycloak-angular';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="auth-wrap">
      <form class="card" (ngSubmit)="submit()">
        <h2>Connexion</h2>

        <!-- Ces champs sont purement décoratifs pour l’instant,
             Keycloak gère lui-même user / password -->
        <label>
          Email
          <input [(ngModel)]="email" name="email" type="email" />
        </label>
        <label>
          Mot de passe
          <input [(ngModel)]="password" name="password" type="password" />
        </label>

        <button class="btn" type="submit">
          Se connecter
        </button>
      </form>
    </div>
  `,
  styles: [`
    .auth-wrap {
      min-height: 70vh;
      display: grid;
      place-items: center;
      padding: 24px;
    }
    .card {
      background: #fff;
      border: 1px solid rgba(0,0,0,.08);
      border-radius: 12px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: 320px;
    }
    .btn {
      padding: 8px 12px;
      border-radius: 8px;
      background: #2740c6;
      color: #fff;
      border: none;
      cursor: pointer;
    }
    input {
      width: 100%;
      padding: 8px;
      border: 1px solid rgba(0,0,0,.15);
      border-radius: 8px;
    }
    label {
      display: flex;
      gap: 6px;
      flex-direction: column;
    }
  `]
})
export class LoginComponent {
  private keycloak = inject(KeycloakService);
  private route = inject(ActivatedRoute);

  email = '';
  password = '';

  submit() {
    // On récupère l’URL de redirection souhaitée (si présente),
    // sinon on renvoie vers /runs après login.
    const redirect =
      this.route.snapshot.queryParamMap.get('redirect')
      || (window.location.origin + '/runs');

    this.keycloak.login({
      redirectUri: redirect,
    });
    // Pas besoin de navigate() ici : Keycloak redirige lui-même.
  }
}
