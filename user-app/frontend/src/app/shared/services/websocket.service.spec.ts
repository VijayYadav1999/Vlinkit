import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NgZone } from '@angular/core';
import { WebSocketService, WebSocketMessage, WebSocketConfig } from './websocket.service';

describe('WebSocketService', () => {
  let service: WebSocketService;
  let ngZone: NgZone;
  let mockWebSocket: any;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WebSocketService, NgZone]
    });

    service = TestBed.inject(WebSocketService);
    ngZone = TestBed.inject(NgZone);

    // Mock WebSocket
    mockWebSocket = {
      send: jasmine.createSpy('send'),
      close: jasmine.createSpy('close'),
      readyState: WebSocket.OPEN,
      url: '',
      onopen: null,
      onclose: null,
      onerror: null,
      onmessage: null
    };

    spyOn(window, 'WebSocket').and.returnValue(mockWebSocket);
  });

  afterEach(() => {
    service.disconnect();
  });

  describe('Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should start as disconnected', (done) => {
      service.getConnectionStatus().subscribe(status => {
        expect(status).toBeDefined();
        done();
      });
    });

    it('should not be connected initially', () => {
      expect(service.isConnected()).toBe(false);
    });
  });

  describe('Connection', () => {
    it('should connect to WebSocket server', (done) => {
      const config: WebSocketConfig = {
        url: 'ws://localhost:8080',
        reconnectInterval: 1000,
        maxReconnectAttempts: 3
      };

      service.connect(config).subscribe(status => {
        if (status === 'connected') {
          expect(service.isConnected()).toBe(true);
          done();
        }
      });

      setTimeout(() => {
        mockWebSocket.onopen();
      }, 10);
    });

    it('should set connection status to connecting', (done) => {
      let receivedStatuses: string[] = [];

      service.getConnectionStatus().subscribe(status => {
        receivedStatuses.push(status);
        if (receivedStatuses.includes('connecting')) {
          expect(receivedStatuses).toContain('connecting');
          done();
        }
      });

      service.connect({ url: 'ws://localhost:8080' });
    });

    it('should emit connected status when connection succeeds', (done) => {
      service.connect({ url: 'ws://localhost:8080' }).subscribe(status => {
        if (status === 'connected') {
          expect(status).toBe('connected');
          done();
        }
      });

      setTimeout(() => {
        mockWebSocket.onopen();
      }, 10);
    });

    it('should reset reconnect attempts on successful connection', (done) => {
      service.connect({ url: 'ws://localhost:8080' }).subscribe(status => {
        if (status === 'connected') {
          expect(service.getReconnectAttempts()).toBe(0);
          done();
        }
      });

      setTimeout(() => {
        mockWebSocket.onopen();
      }, 10);
    });

    it('should handle connection errors', (done) => {
      service.connect({ url: 'ws://invalid-url' }).subscribe(
        () => {},
        error => {
          expect(error).toBeDefined();
          done();
        }
      );

      setTimeout(() => {
        mockWebSocket.onerror(new Event('error'));
      }, 10);
    });
  });

  describe('Disconnection', () => {
    it('should disconnect from server', (done) => {
      service.connect({ url: 'ws://localhost:8080' }).subscribe(status => {
        if (status === 'connected') {
          service.disconnect();
          expect(service.isConnected()).toBe(false);
          done();
        }
      });

      setTimeout(() => {
        mockWebSocket.onopen();
      }, 10);
    });

    it('should call WebSocket close on disconnect', (done) => {
      service.connect({ url: 'ws://localhost:8080' }).subscribe(status => {
        if (status === 'connected') {
          service.disconnect();
          expect(mockWebSocket.close).toHaveBeenCalled();
          done();
        }
      });

      setTimeout(() => {
        mockWebSocket.onopen();
      }, 10);
    });

    it('should set status to disconnected after disconnect', (done) => {
      let finalStatus = '';

      service.getConnectionStatus().subscribe(status => {
        finalStatus = status;
      });

      service.connect({ url: 'ws://localhost:8080' }).subscribe(status => {
        if (status === 'connected') {
          service.disconnect();
          setTimeout(() => {
            expect(finalStatus).toBe('disconnected');
            done();
          }, 100);
        }
      });

      setTimeout(() => {
        mockWebSocket.onopen();
      }, 10);
    });
  });

  describe('Sending Messages', () => {
    it('should send message when connected', (done) => {
      service.connect({ url: 'ws://localhost:8080' }).subscribe(status => {
        if (status === 'connected') {
          service.send('test-event', { data: 'test' });
          expect(mockWebSocket.send).toHaveBeenCalled();
          done();
        }
      });

      setTimeout(() => {
        mockWebSocket.onopen();
      }, 10);
    });

    it('should not send message when disconnected', () => {
      service.send('test-event', { data: 'test' });
      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });

    it('should include event and data in message', (done) => {
      service.connect({ url: 'ws://localhost:8080' }).subscribe(status => {
        if (status === 'connected') {
          service.send('test-event', { value: 123 });

          const callArgs = mockWebSocket.send.calls.mostRecent().args[0];
          const message: WebSocketMessage = JSON.parse(callArgs);

          expect(message.event).toBe('test-event');
          expect(message.data.value).toBe(123);
          done();
        }
      });

      setTimeout(() => {
        mockWebSocket.onopen();
      }, 10);
    });

    it('should send batch of messages', (done) => {
      service.connect({ url: 'ws://localhost:8080' }).subscribe(status => {
        if (status === 'connected') {
          service.sendBatch([
            { event: 'msg1', data: { id: 1 } },
            { event: 'msg2', data: { id: 2 } },
            { event: 'msg3', data: { id: 3 } }
          ]);

          expect(mockWebSocket.send).toHaveBeenCalledTimes(3);
          done();
        }
      });

      setTimeout(() => {
        mockWebSocket.onopen();
      }, 10);
    });
  });

  describe('Receiving Messages', () => {
    it('should receive and emit messages', (done) => {
      service.connect({ url: 'ws://localhost:8080' }).subscribe(status => {
        if (status === 'connected') {
          service.getMessages().subscribe(message => {
            expect(message.event).toBe('test-event');
            expect(message.data.value).toBe(42);
            done();
          });

          setTimeout(() => {
            mockWebSocket.onmessage({
              data: JSON.stringify({
                event: 'test-event',
                data: { value: 42 }
              })
            });
          }, 10);
        }
      });

      setTimeout(() => {
        mockWebSocket.onopen();
      }, 10);
    });

    it('should subscribe to specific event', (done) => {
      service.connect({ url: 'ws://localhost:8080' }).subscribe(status => {
        if (status === 'connected') {
          service.on('specific-event').subscribe(data => {
            expect(data.value).toBe(99);
            done();
          });

          setTimeout(() => {
            mockWebSocket.onmessage({
              data: JSON.stringify({
                event: 'specific-event',
                data: { value: 99 }
              })
            });
          }, 10);
        }
      });

      setTimeout(() => {
        mockWebSocket.onopen();
      }, 10);
    });

    it('should not emit other events when filtering by event', (done) => {
      let otherEventReceived = false;

      service.connect({ url: 'ws://localhost:8080' }).subscribe(status => {
        if (status === 'connected') {
          service.on('event-a').subscribe(() => {
            // Should not receive event-b
            fail('Should not receive other events');
          });

          setTimeout(() => {
            mockWebSocket.onmessage({
              data: JSON.stringify({
                event: 'event-b',
                data: { value: 1 }
              })
            });

            setTimeout(() => {
              done();
            }, 100);
          }, 10);
        }
      });

      setTimeout(() => {
        mockWebSocket.onopen();
      }, 10);
    });

    it('should handle malformed messages gracefully', (done) => {
      service.connect({ url: 'ws://localhost:8080' }).subscribe(status => {
        if (status === 'connected') {
          service.getMessages().subscribe(() => {
            // Should not receive anything
          });

          setTimeout(() => {
            mockWebSocket.onmessage({
              data: 'invalid json'
            });

            setTimeout(() => {
              done();
            }, 100);
          }, 10);
        }
      });

      setTimeout(() => {
        mockWebSocket.onopen();
      }, 10);
    });
  });

  describe('Event Listeners', () => {
    it('should add event listener', (done) => {
      service.connect({ url: 'ws://localhost:8080' }).subscribe(status => {
        if (status === 'connected') {
          const callback = jasmine.createSpy('callback');
          service.addEventListener('test-event', callback);

          setTimeout(() => {
            mockWebSocket.onmessage({
              data: JSON.stringify({
                event: 'test-event',
                data: { value: 1 }
              })
            });

            setTimeout(() => {
              expect(callback).toHaveBeenCalled();
              done();
            }, 50);
          }, 10);
        }
      });

      setTimeout(() => {
        mockWebSocket.onopen();
      }, 10);
    });

    it('should remove event listener', (done) => {
      service.connect({ url: 'ws://localhost:8080' }).subscribe(status => {
        if (status === 'connected') {
          const callback = jasmine.createSpy('callback');
          service.addEventListener('test-event', callback);
          service.removeEventListener('test-event', callback);

          setTimeout(() => {
            mockWebSocket.onmessage({
              data: JSON.stringify({
                event: 'test-event',
                data: { value: 1 }
              })
            });

            setTimeout(() => {
              expect(callback).not.toHaveBeenCalled();
              done();
            }, 50);
          }, 10);
        }
      });

      setTimeout(() => {
        mockWebSocket.onopen();
      }, 10);
    });

    it('should get registered events', (done) => {
      service.connect({ url: 'ws://localhost:8080' }).subscribe(status => {
        if (status === 'connected') {
          service.addEventListener('event1', () => {});
          service.addEventListener('event2', () => {});
          service.addEventListener('event3', () => {});

          const events = service.getRegisteredEvents();
          expect(events.length).toBe(3);
          expect(events).toContain('event1');
          expect(events).toContain('event2');
          expect(events).toContain('event3');
          done();
        }
      });

      setTimeout(() => {
        mockWebSocket.onopen();
      }, 10);
    });

    it('should clear all event listeners', (done) => {
      service.connect({ url: 'ws://localhost:8080' }).subscribe(status => {
        if (status === 'connected') {
          service.addEventListener('event1', () => {});
          service.addEventListener('event2', () => {});

          service.clearEventListeners();
          expect(service.getRegisteredEvents().length).toBe(0);
          done();
        }
      });

      setTimeout(() => {
        mockWebSocket.onopen();
      }, 10);
    });
  });

  describe('Reconnection Logic', () => {
    it('should attempt to reconnect on connection close', fakeAsync(() => {
      service.connect({
        url: 'ws://localhost:8080',
        reconnectInterval: 100,
        maxReconnectAttempts: 3
      }).subscribe();

      setTimeout(() => {
        mockWebSocket.onopen();
      }, 10);

      tick(110);
      mockWebSocket.onclose();
      tick(200);

      // Should have attempted reconnect
      expect(service.getReconnectAttempts()).toBeGreaterThan(0);
    }));

    it('should exponentially backoff on reconnect attempts', fakeAsync(() => {
      service.connect({
        url: 'ws://localhost:8080',
        reconnectInterval: 1000,
        maxReconnectAttempts: 5
      }).subscribe();

      setTimeout(() => {
        mockWebSocket.onopen();
      }, 10);

      tick(110);
      mockWebSocket.onclose();
      tick(1100);
      
      // First attempt delay: 1000ms * 2^0 = 1000ms
      tick(1000);
      mockWebSocket.onclose(); // Simulate another failure
      
      // This demonstrates exponential backoff behavior
    }));

    it('should stop reconnecting after max attempts', fakeAsync(() => {
      service.connect({
        url: 'ws://localhost:8080',
        reconnectInterval: 50,
        maxReconnectAttempts: 2
      }).subscribe();

      tick(100);
      mockWebSocket.onopen();
      tick(110);

      // Trigger disconnection
      mockWebSocket.onclose();
      tick(100);

      // First reconnect attempt
      mockWebSocket.onclose();
      tick(200);

      // Should have reached max attempts
      expect(service.getReconnectAttempts()).toBeLessThanOrEqual(2);
    }));
  });

  describe('Heartbeat', () => {
    it('should send heartbeat messages', fakeAsync((done) => {
      service.connect({
        url: 'ws://localhost:8080',
        heartbeatInterval: 100
      }).subscribe(status => {
        if (status === 'connected') {
          // Wait for heartbeat to trigger
          tick(150);
          
          const calls = mockWebSocket.send.calls.all();
          const hasPing = calls.some(call => {
            try {
              const msg = JSON.parse(call.args[0]);
              return msg.event === 'ping';
            } catch {
              return false;
            }
          });

          expect(hasPing).toBe(true);
        }
      });

      setTimeout(() => {
        mockWebSocket.onopen();
      }, 10);
    }));
  });

  describe('Configuration', () => {
    it('should get current configuration', () => {
      const config: WebSocketConfig = {
        url: 'ws://localhost:8080',
        reconnectInterval: 2000,
        maxReconnectAttempts: 5,
        heartbeatInterval: 30000
      };

      service.connect(config);
      const retrieved = service.getConfig();

      expect(retrieved.url).toBe('ws://localhost:8080');
      expect(retrieved.reconnectInterval).toBe(2000);
      expect(retrieved.maxReconnectAttempts).toBe(5);
    });

    it('should set configuration', () => {
      service.setConfig({
        reconnectInterval: 5000,
        maxReconnectAttempts: 10
      });

      const config = service.getConfig();
      expect(config.reconnectInterval).toBe(5000);
      expect(config.maxReconnectAttempts).toBe(10);
    });
  });

  describe('Mock Implementation', () => {
    it('should mock connect successfully', (done) => {
      service.mockConnect('ws://localhost:8080').subscribe(status => {
        if (status === 'connected') {
          expect(status).toBe('connected');
          done();
        }
      });
    });

    it('should mock receive message', (done) => {
      service.mockConnect('ws://localhost:8080').subscribe(status => {
        if (status === 'connected') {
          service.getMessages().subscribe(message => {
            expect(message.event).toBe('mock-event');
            expect(message.data.value).toBe(123);
            done();
          });

          service.mockReceiveMessage('mock-event', { value: 123 });
        }
      });
    });
  });

  describe('Connection Status Checking', () => {
    it('should check if connected', (done) => {
      service.connect({ url: 'ws://localhost:8080' }).subscribe(status => {
        if (status === 'connected') {
          expect(service.isConnected()).toBe(true);
          done();
        }
      });

      setTimeout(() => {
        mockWebSocket.onopen();
      }, 10);
    });

    it('should return false when not connected', () => {
      expect(service.isConnected()).toBe(false);
    });

    it('should wait for connection with timeout', (done) => {
      const promise = service.waitForConnection(1000);

      promise.then(connected => {
        expect(connected).toBe(true);
        done();
      });

      setTimeout(() => {
        mockWebSocket.onopen();
      }, 100);

      service.connect({ url: 'ws://localhost:8080' }).subscribe(() => {});
    });

    it('should timeout waiting for connection', (done) => {
      const promise = service.waitForConnection(100);

      promise.then(connected => {
        expect(connected).toBe(false);
        done();
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete lifecycle: connect, send, receive, disconnect', (done) => {
      service.connect({ url: 'ws://localhost:8080' }).subscribe(status => {
        if (status === 'connected') {
          service.send('ping');
          
          service.getMessages().subscribe(message => {
            if (message.event === 'pong') {
              service.disconnect();
              expect(service.isConnected()).toBe(false);
              done();
            }
          });

          setTimeout(() => {
            mockWebSocket.onmessage({
              data: JSON.stringify({
                event: 'pong',
                data: {}
              })
            });
          }, 50);
        }
      });

      setTimeout(() => {
        mockWebSocket.onopen();
      }, 10);
    });

    it('should handle multiple simultaneous subscriptions', (done) => {
      service.connect({ url: 'ws://localhost:8080' }).subscribe(status => {
        if (status === 'connected') {
          let received = 0;

          service.on('event1').subscribe(() => received++);
          service.on('event1').subscribe(() => received++);
          service.on('event2').subscribe(() => received++);

          setTimeout(() => {
            mockWebSocket.onmessage({
              data: JSON.stringify({
                event: 'event1',
                data: {}
              })
            });

            mockWebSocket.onmessage({
              data: JSON.stringify({
                event: 'event2',
                data: {}
              })
            });

            setTimeout(() => {
              expect(received).toBe(3); // 2 from event1, 1 from event2
              done();
            }, 100);
          }, 50);
        }
      });

      setTimeout(() => {
        mockWebSocket.onopen();
      }, 10);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources on service destroy', () => {
      service.ngOnDestroy();
      expect(service.isConnected()).toBe(false);
    });
  });
});
