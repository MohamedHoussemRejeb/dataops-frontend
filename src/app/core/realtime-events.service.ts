// src/app/core/realtime-events.service.ts
import { Injectable, signal } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { environment } from '../../environments/environment';

export interface RealtimeEvent {
  type: string;
  source: string;
  timestamp: string;
  payload: any;
}

@Injectable({ providedIn: 'root' })
export class RealtimeEventsService {
  private client: Client | null = null;
  private subscription: StompSubscription | null = null;

  // 🔥 Dernier évènement, plus un historique si tu veux
  lastEvent = signal<RealtimeEvent | null>(null);
  history = signal<RealtimeEvent[]>([]);

  // Pour gérer ON/OFF auto-refresh global
  autoRefresh = signal<boolean>(true);

  connect(apiBaseUrl: string = `${environment.apiBaseUrl}`) {
    if (this.client && this.client.active) {
      return;
    }

    this.client = new Client({
      webSocketFactory: () => new SockJS(`${apiBaseUrl}/ws-events`),
      reconnectDelay: 3000, // auto-reconnect 3s
      debug: (str) => console.log('[WS]', str),
    });

    this.client.onConnect = () => {
      console.log('🟢 WebSocket connected');
      this.subscription = this.client!.subscribe('/topic/events', (msg: IMessage) => {
        try {
          const body = JSON.parse(msg.body) as RealtimeEvent;
          this.lastEvent.set(body);
          this.history.update(list => [...list, body].slice(-200)); // garde les derniers 200
        } catch (e) {
          console.error('Error parsing WS event', e);
        }
      });
    };

    this.client.onStompError = (frame) => {
      console.error('Broker error', frame.headers['message'], frame.body);
    };

    this.client.onWebSocketClose = () => {
      console.warn('🔴 WebSocket closed');
    };

    this.client.activate();
  }

  disconnect() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
  }
}
