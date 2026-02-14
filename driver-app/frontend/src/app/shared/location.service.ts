import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject, BehaviorSubject } from 'rxjs';

export interface DriverLocation {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class LocationService {
  private watchId: number | null = null;
  private location$ = new BehaviorSubject<DriverLocation | null>(null);
  private error$ = new Subject<string>();

  constructor(private ngZone: NgZone) {}

  /** Start watching driver's GPS position */
  startTracking(): Observable<DriverLocation | null> {
    if (this.watchId !== null) return this.location$.asObservable();

    if (!navigator.geolocation) {
      this.error$.next('Geolocation not supported');
      return this.location$.asObservable();
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.ngZone.run(() => {
          this.location$.next({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            heading: position.coords.heading ?? undefined,
            speed: position.coords.speed ?? undefined,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          });
        });
      },
      (error) => {
        this.ngZone.run(() => {
          this.error$.next(error.message);
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      },
    );

    return this.location$.asObservable();
  }

  /** Stop tracking */
  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  /** Get current location one-shot */
  getCurrentPosition(): Promise<DriverLocation> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          heading: pos.coords.heading ?? undefined,
          speed: pos.coords.speed ?? undefined,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });
  }

  getLocation(): DriverLocation | null {
    return this.location$.value;
  }

  getErrors(): Observable<string> {
    return this.error$.asObservable();
  }
}
