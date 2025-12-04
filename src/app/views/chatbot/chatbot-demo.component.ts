import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatbotApiService } from '../../core/chatbot-api.service';

@Component({
  selector: 'app-chatbot-demo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot-demo.component.html',
  styleUrls: ['./chatbot-demo.component.scss']
})
export class ChatbotDemoComponent {
  prompt = '';
  response = '';
  loading = false;

  // ⭐ état du widget (ouvert / fermé)
  isOpen = false;

  constructor(private chatbot: ChatbotApiService) {}

  // ouvrir / fermer quand on clique sur le logo
  toggleOpen(): void {
    this.isOpen = !this.isOpen;
  }

  send(): void {
    if (!this.prompt.trim() || this.loading) {
      return;
    }

    this.loading = true;
    this.response = '';

    this.chatbot.ask(this.prompt).subscribe({
      next: res => {
        this.response = res;
        this.loading = false;
      },
      error: err => {
        this.response = 'Erreur: ' + (err?.message ?? 'inconnue');
        this.loading = false;
      }
    });
  }

  useSuggestion(text: string): void {
    this.prompt = text;
    // optionnel : s’assurer que le widget est ouvert
    this.isOpen = true;
    this.send();
  }
}
