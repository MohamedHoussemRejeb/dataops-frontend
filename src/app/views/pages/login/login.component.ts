// src/app/views/pages/login/login.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';

import { IconDirective } from '@coreui/icons-angular';
import {
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardGroupComponent,
  ColComponent,
  ContainerComponent,
  FormControlDirective,
  FormDirective,
  InputGroupComponent,
  InputGroupTextDirective,
  RowComponent
} from '@coreui/angular';

interface KeycloakTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
  token_type: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  imports: [
    CommonModule,
    FormsModule,
    ContainerComponent, RowComponent, ColComponent, CardGroupComponent,
    CardComponent, CardBodyComponent, FormDirective, InputGroupComponent,
    InputGroupTextDirective, IconDirective, FormControlDirective, ButtonDirective
  ]
})
export class LoginComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);

  email = '';
  password = '';
  error = '';
  submitting = false;

  // 👁️ show/hide password
  showPassword = false;

  // URL Keycloak
  private tokenUrl =
    'http://localhost:8181/realms/dataops/protocol/openid-connect/token';

  private clientId = 'dataops-angular';

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  async login() {
    if (!this.email || !this.password) {
      this.error = 'Veuillez entrer votre email et mot de passe.';
      return;
    }

    this.error = '';
    this.submitting = true;

    const body = new HttpParams()
      .set('client_id', this.clientId)
      .set('grant_type', 'password')
      .set('username', this.email)
      .set('password', this.password);

    try {
      const tokenResponse = await this.http
        .post<KeycloakTokenResponse>(this.tokenUrl, body.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        })
        .toPromise();

      if (!tokenResponse) {
        throw new Error('Empty token response');
      }

      // Sauvegarde du token
      localStorage.setItem('access_token', tokenResponse.access_token);
      localStorage.setItem('refresh_token', tokenResponse.refresh_token);

      const redirectPath =
        this.route.snapshot.queryParamMap.get('redirect') || '/runs';

      this.router.navigateByUrl(redirectPath);

    } catch (e: any) {
      console.error('[Login] Error', e);

      if (e?.status === 401) {
        this.error = 'Identifiants incorrects.';
      } else {
        this.error = 'Erreur de connexion au serveur.';
      }

    } finally {
      this.submitting = false;
    }
  }
}
