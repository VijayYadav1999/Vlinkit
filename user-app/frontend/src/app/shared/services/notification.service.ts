import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  dismissible?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications$ = new BehaviorSubject<Notification[]>([]);
  private notificationIdCounter = 0;
  private notificationTimers: Map<string, number> = new Map();

  constructor(private ngZone: NgZone) {}

  /**
   * Get all notifications as observable
   */
  getNotifications(): Observable<Notification[]> {
    return this.notifications$.asObservable();
  }

  /**
   * Show success notification
   */
  showSuccess(message: string, duration: number = 3000): string {
    return this.addNotification({
      message,
      type: 'success',
      duration,
      dismissible: true
    });
  }

  /**
   * Show error notification
   */
  showError(message: string, duration: number = 5000): string {
    return this.addNotification({
      message,
      type: 'error',
      duration,
      dismissible: true
    });
  }

  /**
   * Show info notification
   */
  showInfo(message: string, duration: number = 3000): string {
    return this.addNotification({
      message,
      type: 'info',
      duration,
      dismissible: true
    });
  }

  /**
   * Show warning notification
   */
  showWarning(message: string, duration: number = 4000): string {
    return this.addNotification({
      message,
      type: 'warning',
      duration,
      dismissible: true
    });
  }

  /**
   * Dismiss specific notification by ID
   */
  dismiss(id: string): void {
    // Clear auto-dismiss timer if exists
    if (this.notificationTimers.has(id)) {
      clearTimeout(this.notificationTimers.get(id));
      this.notificationTimers.delete(id);
    }

    // Remove notification from list
    const currentNotifications = this.notifications$.getValue();
    const filtered = currentNotifications.filter(n => n.id !== id);
    this.notifications$.next(filtered);
  }

  /**
   * Dismiss all notifications
   */
  dismissAll(): void {
    // Clear all timers
    this.notificationTimers.forEach(timerId => {
      clearTimeout(timerId);
    });
    this.notificationTimers.clear();

    // Clear notifications
    this.notifications$.next([]);
  }

  /**
   * Get current notifications list (synchronous)
   */
  getCurrentNotifications(): Notification[] {
    return this.notifications$.getValue();
  }

  /**
   * Check if notification with ID exists
   */
  hasNotification(id: string): boolean {
    return this.getCurrentNotifications().some(n => n.id === id);
  }

  /**
   * Get notification by ID
   */
  getNotificationById(id: string): Notification | undefined {
    return this.getCurrentNotifications().find(n => n.id === id);
  }

  /**
   * Queue multiple notifications
   */
  queueNotifications(notifications: Array<{ message: string; type: 'success' | 'error' | 'info' | 'warning'; duration?: number }>): string[] {
    const ids: string[] = [];
    notifications.forEach((notification, index) => {
      // Stagger notifications by 100ms for better UX
      setTimeout(() => {
        const id = this.addNotification(notification);
        ids.push(id);
      }, index * 100);
    });
    return ids;
  }

  /**
   * Private helper: Add notification
   */
  private addNotification(notification: Partial<Notification>): string {
    const id = `notification-${++this.notificationIdCounter}`;
    const newNotification: Notification = {
      id,
      message: notification.message || '',
      type: notification.type || 'info',
      duration: notification.duration,
      dismissible: notification.dismissible !== undefined ? notification.dismissible : true
    };

    // Add notification to list
    const currentNotifications = this.notifications$.getValue();
    this.notifications$.next([...currentNotifications, newNotification]);

    // Set auto-dismiss timer if duration specified
    if (newNotification.duration && newNotification.duration > 0) {
      this.ngZone.runOutsideAngular(() => {
        const timerId = window.setTimeout(() => {
          this.ngZone.run(() => {
            this.dismiss(id);
          });
        }, newNotification.duration);

        this.notificationTimers.set(id, timerId);
      });
    }

    return id;
  }

  /**
   * Track notification lifecycle
   */
  trackNotificationLifecycle(id: string): Observable<Notification | undefined> {
    return new Observable(observer => {
      const updateSubscription = this.notifications$.subscribe(notifications => {
        const notification = notifications.find(n => n.id === id);
        observer.next(notification);
        
        if (!notification) {
          observer.complete();
        }
      });

      return () => updateSubscription.unsubscribe();
    });
  }

  /**
   * Batch operation: Show multiple notifications
   */
  showBatch(...notifications: Array<{ message: string; type: 'success' | 'error' | 'info' | 'warning'; duration?: number }>): string[] {
    return notifications.map(notification => {
      switch (notification.type) {
        case 'success':
          return this.showSuccess(notification.message, notification.duration);
        case 'error':
          return this.showError(notification.message, notification.duration);
        case 'info':
          return this.showInfo(notification.message, notification.duration);
        case 'warning':
          return this.showWarning(notification.message, notification.duration);
        default:
          return this.showInfo(notification.message, notification.duration);
      }
    });
  }

  /**
   * Check if any notifications of specific type exist
   */
  hasNotificationType(type: Notification['type']): boolean {
    return this.getCurrentNotifications().some(n => n.type === type);
  }

  /**
   * Get count of notifications
   */
  getNotificationCount(): number {
    return this.getCurrentNotifications().length;
  }

  /**
   * Get count of notifications by type
   */
  getNotificationCountByType(type: Notification['type']): number {
    return this.getCurrentNotifications().filter(n => n.type === type).length;
  }

  /**
   * Auto-dismiss pending notifications after delay
   */
  autoDismissAfterDelay(duration: number): void {
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.ngZone.run(() => {
          this.dismissAll();
        });
      }, duration);
    });
  }

  /**
   * Clear notifications of specific type
   */
  dismissByType(type: Notification['type']): void {
    const currentNotifications = this.getCurrentNotifications();
    const toRemove = currentNotifications.filter(n => n.type === type);

    toRemove.forEach(notification => {
      this.dismiss(notification.id);
    });
  }

  /**
   * Update notification message
   */
  updateMessage(id: string, message: string): boolean {
    const currentNotifications = this.getCurrentNotifications();
    const notification = currentNotifications.find(n => n.id === id);

    if (notification) {
      notification.message = message;
      this.notifications$.next([...currentNotifications]);
      return true;
    }

    return false;
  }

  /**
   * Extend notification duration
   */
  extendDuration(id: string, additionalDuration: number): boolean {
    const notification = this.getNotificationById(id);

    if (!notification || !notification.duration) {
      return false;
    }

    // Clear existing timer
    if (this.notificationTimers.has(id)) {
      clearTimeout(this.notificationTimers.get(id));
      this.notificationTimers.delete(id);
    }

    // Set new timer with extended duration
    const newDuration = notification.duration + additionalDuration;
    this.ngZone.runOutsideAngular(() => {
      const timerId = window.setTimeout(() => {
        this.ngZone.run(() => {
          this.dismiss(id);
        });
      }, newDuration);

      this.notificationTimers.set(id, timerId);
    });

    return true;
  }
}
