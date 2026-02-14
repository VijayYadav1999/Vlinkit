import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NgZone } from '@angular/core';
import { NotificationService, Notification } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let ngZone: NgZone;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NotificationService]
    });

    service = TestBed.inject(NotificationService);
    ngZone = TestBed.inject(NgZone);
  });

  afterEach(() => {
    service.dismissAll();
  });

  describe('Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should start with no notifications', () => {
      expect(service.getCurrentNotifications()).toEqual([]);
    });

    it('should provide notifications as observable', (done) => {
      service.getNotifications().subscribe(notifications => {
        expect(Array.isArray(notifications)).toBe(true);
        done();
      });
    });
  });

  describe('Success Notifications', () => {
    it('should show success notification', () => {
      const id = service.showSuccess('Success message');
      const notifications = service.getCurrentNotifications();

      expect(notifications.length).toBe(1);
      expect(notifications[0].type).toBe('success');
      expect(notifications[0].message).toBe('Success message');
    });

    it('should return notification ID', () => {
      const id = service.showSuccess('Test');
      expect(id).toContain('notification-');
    });

    it('should set default duration for success (3000ms)', fakeAsync(() => {
      const id = service.showSuccess('Test');
      expect(service.hasNotification(id)).toBe(true);

      tick(3000);
      expect(service.hasNotification(id)).toBe(false);
    }));

    it('should respect custom duration for success', fakeAsync(() => {
      const id = service.showSuccess('Test', 5000);
      tick(3000);
      expect(service.hasNotification(id)).toBe(true);

      tick(2000);
      expect(service.hasNotification(id)).toBe(false);
    }));

    it('should be dismissible by default', () => {
      service.showSuccess('Test');
      const notification = service.getCurrentNotifications()[0];
      expect(notification.dismissible).toBe(true);
    });
  });

  describe('Error Notifications', () => {
    it('should show error notification', () => {
      const id = service.showError('Error message');
      const notifications = service.getCurrentNotifications();

      expect(notifications.length).toBe(1);
      expect(notifications[0].type).toBe('error');
      expect(notifications[0].message).toBe('Error message');
    });

    it('should set default duration for error (5000ms)', fakeAsync(() => {
      const id = service.showError('Test');
      expect(service.hasNotification(id)).toBe(true);

      tick(5000);
      expect(service.hasNotification(id)).toBe(false);
    }));

    it('should respect custom duration for error', fakeAsync(() => {
      const id = service.showError('Test', 2000);
      tick(2000);
      expect(service.hasNotification(id)).toBe(false);
    }));
  });

  describe('Info Notifications', () => {
    it('should show info notification', () => {
      const id = service.showInfo('Info message');
      const notifications = service.getCurrentNotifications();

      expect(notifications[0].type).toBe('info');
      expect(notifications[0].message).toBe('Info message');
    });

    it('should set default duration for info (3000ms)', fakeAsync(() => {
      const id = service.showInfo('Test');
      tick(3000);
      expect(service.hasNotification(id)).toBe(false);
    }));
  });

  describe('Warning Notifications', () => {
    it('should show warning notification', () => {
      const id = service.showWarning('Warning message');
      const notifications = service.getCurrentNotifications();

      expect(notifications[0].type).toBe('warning');
      expect(notifications[0].message).toBe('Warning message');
    });

    it('should set default duration for warning (4000ms)', fakeAsync(() => {
      const id = service.showWarning('Test');
      tick(4000);
      expect(service.hasNotification(id)).toBe(false);
    }));
  });

  describe('Dismissing Notifications', () => {
    it('should dismiss notification by ID', () => {
      const id = service.showSuccess('Test');
      expect(service.hasNotification(id)).toBe(true);

      service.dismiss(id);
      expect(service.hasNotification(id)).toBe(false);
    });

    it('should dismiss all notifications', () => {
      service.showSuccess('Test 1');
      service.showError('Test 2');
      service.showInfo('Test 3');

      expect(service.getNotificationCount()).toBe(3);
      service.dismissAll();
      expect(service.getNotificationCount()).toBe(0);
    });

    it('should clear timer on dismissal', fakeAsync(() => {
      const id = service.showSuccess('Test', 5000);
      service.dismiss(id);

      tick(5000);
      expect(service.hasNotification(id)).toBe(false);
    }));

    it('should dismiss by type', () => {
      service.showSuccess('Success 1');
      service.showSuccess('Success 2');
      service.showError('Error 1');

      expect(service.getNotificationCount()).toBe(3);
      service.dismissByType('success');
      expect(service.getNotificationCount()).toBe(1);
      expect(service.getCurrentNotifications()[0].type).toBe('error');
    });
  });

  describe('Notification Management', () => {
    it('should get notification by ID', () => {
      const id = service.showSuccess('Test');
      const notification = service.getNotificationById(id);

      expect(notification).toBeDefined();
      expect(notification?.message).toBe('Test');
    });

    it('should return undefined for non-existent notification', () => {
      const notification = service.getNotificationById('non-existent');
      expect(notification).toBeUndefined();
    });

    it('should count total notifications', () => {
      service.showSuccess('Test 1');
      service.showError('Test 2');
      service.showInfo('Test 3');

      expect(service.getNotificationCount()).toBe(3);
    });

    it('should count notifications by type', () => {
      service.showSuccess('Test 1');
      service.showSuccess('Test 2');
      service.showError('Test 3');

      expect(service.getNotificationCountByType('success')).toBe(2);
      expect(service.getNotificationCountByType('error')).toBe(1);
      expect(service.getNotificationCountByType('info')).toBe(0);
    });

    it('should check if notification type exists', () => {
      service.showSuccess('Test');

      expect(service.hasNotificationType('success')).toBe(true);
      expect(service.hasNotificationType('error')).toBe(false);
    });
  });

  describe('Batch Operations', () => {
    it('should queue multiple notifications', fakeAsync(() => {
      service.queueNotifications([
        { message: 'First', type: 'success' },
        { message: 'Second', type: 'error' },
        { message: 'Third', type: 'info' }
      ]);

      // Staggered by 100ms each
      expect(service.getNotificationCount()).toBe(0);

      tick(100);
      expect(service.getNotificationCount()).toBe(1);

      tick(100);
      expect(service.getNotificationCount()).toBe(2);

      tick(100);
      expect(service.getNotificationCount()).toBe(3);
    }));

    it('should show multiple notifications in batch', () => {
      const ids = service.showBatch(
        { message: 'Success', type: 'success' },
        { message: 'Error', type: 'error' },
        { message: 'Info', type: 'info' }
      );

      expect(ids.length).toBe(3);
      expect(service.getNotificationCount()).toBe(3);
    });

    it('should auto-dismiss after delay', fakeAsync(() => {
      service.showSuccess('Test 1');
      service.showError('Test 2');

      expect(service.getNotificationCount()).toBe(2);

      service.autoDismissAfterDelay(2000);
      tick(2000);

      expect(service.getNotificationCount()).toBe(0);
    }));
  });

  describe('Notification Updates', () => {
    it('should update notification message', () => {
      const id = service.showSuccess('Original message');
      const updated = service.updateMessage(id, 'Updated message');

      expect(updated).toBe(true);
      expect(service.getNotificationById(id)?.message).toBe('Updated message');
    });

    it('should return false when updating non-existent notification', () => {
      const updated = service.updateMessage('non-existent', 'New message');
      expect(updated).toBe(false);
    });

    it('should extend notification duration', fakeAsync(() => {
      const id = service.showSuccess('Test', 2000);
      
      tick(1500);
      expect(service.hasNotification(id)).toBe(true);

      service.extendDuration(id, 2000); // Extend by 2 seconds

      tick(500);
      expect(service.hasNotification(id)).toBe(true); // Should still be there

      tick(2000);
      expect(service.hasNotification(id)).toBe(false); // Now it should be gone
    }));

    it('should return false when extending duration of non-existent notification', () => {
      const extended = service.extendDuration('non-existent', 1000);
      expect(extended).toBe(false);
    });
  });

  describe('Notification Lifecycle Tracking', () => {
    it('should track notification lifecycle', fakeAsync((done) => {
      const id = service.showSuccess('Test');
      let lifecycleCount = 0;

      service.trackNotificationLifecycle(id).subscribe(notification => {
        if (notification) {
          lifecycleCount++;
          expect(notification.id).toBe(id);
        }
      });

      tick(3000);
      // Notification should be auto-dismissed
    }));

    it('should complete tracking when notification is dismissed', (done) => {
      const id = service.showSuccess('Test', 10000); // Long duration

      let completed = false;
      service.trackNotificationLifecycle(id).subscribe(
        notification => {
          expect(notification).toBeDefined();
        },
        error => {
          fail('should not error');
        },
        () => {
          completed = true;
        }
      );

      service.dismiss(id);

      setTimeout(() => {
        expect(completed).toBe(true);
        done();
      }, 100);
    });
  });

  describe('Observable Behavior', () => {
    it('should emit notification updates', (done) => {
      let emissionCount = 0;

      service.getNotifications().subscribe(notifications => {
        emissionCount++;
        if (emissionCount === 2) { // Initial empty, then with notification
          expect(notifications.length).toBe(1);
          done();
        }
      });

      service.showSuccess('Test');
    });

    it('should emit when notifications are dismissed', (done) => {
      const id = service.showSuccess('Test', 10000);
      let emissionCount = 0;

      service.getNotifications().subscribe(notifications => {
        emissionCount++;
        if (emissionCount === 3) { // Initial, add, dismiss
          expect(notifications.length).toBe(0);
          done();
        }
      });

      setTimeout(() => {
        service.dismiss(id);
      }, 100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message', () => {
      const id = service.showSuccess('');
      expect(service.hasNotification(id)).toBe(true);
      expect(service.getNotificationById(id)?.message).toBe('');
    });

    it('should handle very long message', () => {
      const longMessage = 'A'.repeat(1000);
      const id = service.showSuccess(longMessage);
      expect(service.getNotificationById(id)?.message).toBe(longMessage);
    });

    it('should handle special characters in message', () => {
      const specialMessage = 'Test @#$%^&*()_+-={}[]|:;<>?,./';
      const id = service.showSuccess(specialMessage);
      expect(service.getNotificationById(id)?.message).toBe(specialMessage);
    });

    it('should handle rapid dismissal', () => {
      const id1 = service.showSuccess('Test 1');
      const id2 = service.showSuccess('Test 2');
      const id3 = service.showSuccess('Test 3');

      service.dismiss(id1);
      service.dismiss(id2);
      service.dismiss(id3);

      expect(service.getNotificationCount()).toBe(0);
    });

    it('should handle zero duration', fakeAsync(() => {
      const id = service.showSuccess('Test', 0);
      expect(service.hasNotification(id)).toBe(true); // Wait for check

      tick(100);
      // Should not auto-dismiss (duration 0 is falsy)
      expect(service.hasNotification(id)).toBe(true);

      service.dismiss(id);
    }));

    it('should handle negative duration', fakeAsync(() => {
      const id = service.showSuccess('Test', -1000);
      tick(200);
      expect(service.hasNotification(id)).toBe(true); // Negative duration won't trigger dismiss

      service.dismiss(id);
    }));

    it('should handle many concurrent notifications', () => {
      for (let i = 0; i < 100; i++) {
        service.showSuccess(`Notification ${i}`);
      }

      expect(service.getNotificationCount()).toBe(100);
      service.dismissAll();
      expect(service.getNotificationCount()).toBe(0);
    });

    it('should handle notification with special types', () => {
      service.showSuccess('Type: success');
      service.showError('Type: error');
      service.showInfo('Type: info');
      service.showWarning('Type: warning');

      expect(service.getNotificationCountByType('success')).toBe(1);
      expect(service.getNotificationCountByType('error')).toBe(1);
      expect(service.getNotificationCountByType('info')).toBe(1);
      expect(service.getNotificationCountByType('warning')).toBe(1);
    });
  });

  describe('Timer Management', () => {
    it('should clear timers on dismissAll', fakeAsync(() => {
      service.showSuccess('Test 1', 5000);
      service.showError('Test 2', 5000);
      service.showInfo('Test 3', 5000);

      service.dismissAll();
      tick(5000);

      expect(service.getNotificationCount()).toBe(0);
    }));

    it('should handle timer updates on extend', fakeAsync(() => {
      const id = service.showSuccess('Test', 2000);
      
      tick(1000);
      service.extendDuration(id, 3000); // Now total 3 more seconds

      tick(2000);
      expect(service.hasNotification(id)).toBe(true);

      tick(1000);
      expect(service.hasNotification(id)).toBe(false);
    }));

    it('should prevent memory leaks on rapid notification creation', fakeAsync(() => {
      for (let i = 0; i < 50; i++) {
        service.showSuccess(`Test ${i}`, 100);
      }

      tick(200);
      expect(service.getNotificationCount()).toBe(0);
    }));
  });

  describe('Notification Properties', () => {
    it('should have correct ID format', () => {
      const id = service.showSuccess('Test');
      expect(id).toMatch(/^notification-\d+$/);
    });

    it('should have unique IDs', () => {
      const id1 = service.showSuccess('Test 1');
      const id2 = service.showSuccess('Test 2');
      const id3 = service.showSuccess('Test 3');

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it('should have correct default properties', () => {
      const id = service.showSuccess('Test');
      const notification = service.getNotificationById(id);

      expect(notification?.id).toBe(id);
      expect(notification?.message).toBe('Test');
      expect(notification?.type).toBe('success');
      expect(notification?.dismissible).toBe(true);
      expect(notification?.duration).toBe(3000);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete lifecycle: create, update, dismiss', fakeAsync(() => {
      const id = service.showSuccess('Initial message', 5000);

      service.updateMessage(id, 'Updated message');
      expect(service.getNotificationById(id)?.message).toBe('Updated message');

      service.extendDuration(id, 2000);
      tick(5000);
      expect(service.hasNotification(id)).toBe(true);

      tick(2000);
      expect(service.hasNotification(id)).toBe(false);
    }));

    it('should handle error recovery workflow', () => {
      const errorId = service.showError('Connection failed', 5000);
      const infoId = service.showInfo('Retrying...', 3000);

      expect(service.getNotificationCount()).toBe(2);

      service.dismissByType('error');
      expect(service.getNotificationCount()).toBe(1);

      service.showSuccess('Reconnected successfully');
      expect(service.getNotificationCount()).toBe(2);
    });

    it('should handle multi-step process notifications', fakeAsync(() => {
      const id1 = service.showInfo('Step 1: Starting...', 2000);
      tick(2000);
      expect(service.hasNotification(id1)).toBe(false);

      const id2 = service.showInfo('Step 2: Processing...', 2000);
      tick(2000);
      expect(service.hasNotification(id2)).toBe(false);

      const id3 = service.showSuccess('Step 3: Complete!', 2000);
      tick(2000);
      expect(service.hasNotification(id3)).toBe(false);
    }));
  });
});
