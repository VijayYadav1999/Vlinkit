import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable, Subject, interval } from 'rxjs';
import { tap, takeUntil, filter } from 'rxjs/operators';

export interface WebSocketMessage {
  event: string;
  data: any;
  timestamp?: Date;
}

export interface WebSocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private webSocket: WebSocket | null = null;
  private connectionStatus$ = new BehaviorSubject<'connected' | 'disconnected' | 'connecting' | 'reconnecting'>('disconnected');
  private messageSubject$ = new Subject<WebSocketMessage>();
  private eventListeners: Map<string, Set<(data: any) => void>> = new Map();
  private destroy$ = new Subject<void>();
  
  private config: WebSocketConfig = {
    url: '',
    reconnectInterval: 2000,
    maxReconnectAttempts: 5,
    heartbeatInterval: 30000
  };

  private reconnectAttempts = 0;
  private heartbeatTimer: number | null = null;

  constructor(private ngZone: NgZone) {}

  /**
   * Connect to WebSocket server
   */
  connect(config: WebSocketConfig): Observable<'connected' | 'disconnected' | 'connecting' | 'reconnecting'> {
    this.config = { ...this.config, ...config };

    return new Observable(observer => {
      this.ngZone.runOutsideAngular(() => {
        try {
          this.performConnect();
          observer.next(this.connectionStatus$.getValue());
        } catch (error) {
          console.error('Failed to connect to WebSocket:', error);
          observer.error(error);
        }
      });

      // Subscribe to connection status changes
      return this.connectionStatus$.subscribe(status => {
        this.ngZone.run(() => {
          observer.next(status);
        });
      });
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.connectionStatus$.next('disconnecting' as any);
    
    if (this.webSocket) {
      this.webSocket.close();
      this.webSocket = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    this.destroy$.next();
    this.connectionStatus$.next('disconnected');
    console.log('WebSocket disconnected');
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): Observable<string> {
    return this.connectionStatus$.asObservable();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.webSocket?.readyState === WebSocket.OPEN;
  }

  /**
   * Send message to server
   */
  send(event: string, data?: any): void {
    if (!this.isConnected()) {
      console.warn('WebSocket is not connected');
      return;
    }

    const message: WebSocketMessage = {
      event,
      data,
      timestamp: new Date()
    };

    try {
      this.webSocket?.send(JSON.stringify(message));
      console.log('Message sent:', event);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  /**
   * Subscribe to message events
   */
  on(event: string): Observable<any> {
    return this.messageSubject$.asObservable().pipe(
      filter(message => message.event === event),
      tap(message => console.log('Message received:', event, message.data))
    );
  }

  /**
   * Subscribe to specific event with callback
   */
  addEventListener(event: string, callback: (data: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }

    this.eventListeners.get(event)?.add(callback);

    // Subscribe to messages
    this.messageSubject$.pipe(
      filter(message => message.event === event),
      takeUntil(this.destroy$)
    ).subscribe(message => {
      callback(message.data);
    });
  }

  /**
   * Remove event listener
   */
  removeEventListener(event: string, callback: (data: any) => void): void {
    this.eventListeners.get(event)?.delete(callback);
  }

  /**
   * Get all registered events
   */
  getRegisteredEvents(): string[] {
    return Array.from(this.eventListeners.keys());
  }

  /**
   * Clear all event listeners
   */
  clearEventListeners(): void {
    this.eventListeners.clear();
  }

  /**
   * Subscribe to all messages
   */
  getMessages(): Observable<WebSocketMessage> {
    return this.messageSubject$.asObservable();
  }

  /**
   * Private: Perform WebSocket connection
   */
  private performConnect(): void {
    this.connectionStatus$.next('connecting');

    try {
      this.webSocket = new WebSocket(this.config.url!);

      this.webSocket.onopen = () => {
        this.ngZone.run(() => {
          this.connectionStatus$.next('connected');
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          console.log('WebSocket connected');
        });
      };

      this.webSocket.onmessage = (event: MessageEvent) => {
        this.ngZone.run(() => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            message.timestamp = new Date();
            this.messageSubject$.next(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        });
      };

      this.webSocket.onerror = (event: Event) => {
        this.ngZone.run(() => {
          console.error('WebSocket error:', event);
        });
      };

      this.webSocket.onclose = () => {
        this.ngZone.run(() => {
          this.connectionStatus$.next('disconnected');
          if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
          }
          this.attemptReconnect();
        });
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.attemptReconnect();
    }
  }

  /**
   * Private: Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts!) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectInterval! * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Attempting to reconnect... (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);

    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.ngZone.run(() => {
          this.connectionStatus$.next('reconnecting');
          this.performConnect();
        });
      }, delay);
    });
  }

  /**
   * Private: Start heartbeat check
   */
  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.ngZone.runOutsideAngular(() => {
      this.heartbeatTimer = window.setInterval(() => {
        if (this.isConnected()) {
          this.send('ping');
        }
      }, this.config.heartbeatInterval);
    });
  }

  /**
   * Send multiple messages in batch
   */
  sendBatch(messages: Array<{ event: string; data?: any }>): void {
    messages.forEach(msg => {
      this.send(msg.event, msg.data);
    });
  }

  /**
   * Mock implementation for testing
   */
  mockConnect(url: string): Observable<'connected' | 'disconnected' | 'connecting' | 'reconnecting'> {
    return new Observable(observer => {
      setTimeout(() => {
        this.ngZone.run(() => {
          this.connectionStatus$.next('connected');
          observer.next('connected');
        });
      }, 100);

      return this.connectionStatus$.subscribe(status => {
        observer.next(status);
      });
    });
  }

  /**
   * Mock: Simulate receiving message
   */
  mockReceiveMessage(event: string, data: any): void {
    const message: WebSocketMessage = {
      event,
      data,
      timestamp: new Date()
    };

    this.messageSubject$.next(message);
  }

  /**
   * Get current reconnect attempts
   */
  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  /**
   * Set configuration
   */
  setConfig(config: Partial<WebSocketConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): WebSocketConfig {
    return { ...this.config };
  }

  /**
   * Wait for connection to be established
   */
  waitForConnection(timeout: number = 5000): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.isConnected()) {
        resolve(true);
        return;
      }

      const subscription = this.connectionStatus$.subscribe(status => {
        if (status === 'connected') {
          subscription.unsubscribe();
          resolve(true);
        }
      });

      setTimeout(() => {
        subscription.unsubscribe();
        resolve(false);
      }, timeout);
    });
  }

  /**
   * Cleanup on service destroy
   */
  ngOnDestroy(): void {
    this.disconnect();
    this.destroy$.complete();
  }
}
