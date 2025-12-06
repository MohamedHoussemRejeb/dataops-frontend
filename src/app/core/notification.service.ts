// src/app/core/notification.service.ts

import { Injectable, signal } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { environment } from '../../environments/environment';

export interface Notification {
  id?: number;
  type: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS' | string;
  title: string;
  message: string;
  targetType?: string;
  targetId?: string;
  read?: boolean;
  createdAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private stompClient?: Client;
  notifications = signal<Notification[]>([]);

  /**
   * Connexion au backend WebSocket.

   */
  connect(apiBaseUrl: string = environment.apiBaseUrl) {
    // évite les doubles connexions
    if (this.stompClient?.active) {
      return;
    }

    const socketUrl = apiBaseUrl.replace(/\/+$/, '') + '/ws-notifications';
    const socket = new SockJS(socketUrl);

    this.stompClient = new Client({
      webSocketFactory: () => socket as any,
      reconnectDelay: 5000,
      debug: (msg: string) => {
        // tu peux commenter si ça spam trop
        console.log('[STOMP]', msg);
      }
    });

    this.stompClient.onConnect = () => {
      console.log('[WS] Connected to notifications');

      if (!this.stompClient) {
        console.warn('[WS] stompClient is undefined in onConnect');
        return;
      }

      // ✅ subscribe sécurisé
      this.stompClient.subscribe('/topic/notifications', (message: IMessage) => {
        try {
          const body: Notification = JSON.parse(message.body);
          console.log('[WS] Notification received =', body);
          this.addNotification(body);
        } catch (e) {
          console.error('[WS] Error parsing notification body', e, message.body);
        }
      });
    };

    this.stompClient.onStompError = (frame) => {
      console.error('[STOMP] Broker error', frame.headers['message'], frame.body);
    };

    this.stompClient.onWebSocketError = (event) => {
      console.error('[WS] WebSocket error', event);
    };

    this.stompClient.activate();
  }

  private addNotification(notif: Notification) {
    this.notifications.update(list => [notif, ...list]);
  }

  markAsRead(index: number) {
    this.notifications.update(list => {
      const copy = [...list];
      if (copy[index]) copy[index].read = true;
      return copy;
    });
  }

  get unreadCount(): number {
    return this.notifications().filter(n => !n.read).length;
  }
}
