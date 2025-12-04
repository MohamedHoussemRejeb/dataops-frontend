import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatbotApiService } from '../../core/chatbot-api.service';

@Component({
  selector: 'app-chatbot-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot-widget.component.html',
  styleUrls: ['./chatbot-widget.component.scss']
})
export class ChatbotWidgetComponent {
  isOpen = false;
  prompt = '';
  response = '';
  loading = false;

  constructor(private chatbot: ChatbotApiService) {}

  toggleOpen() {
    this.isOpen = !this.isOpen;
  }

  send() {
    if (!this.prompt.trim() || this.loading) return;

    this.loading = true;
    this.response = '';

    this.chatbot.ask(this.prompt).subscribe({
      next: res => { this.response = res; this.loading = false; },
      error: err => { this.response = 'Erreur: ' + err?.message; this.loading = false; }
    });
  }
}
