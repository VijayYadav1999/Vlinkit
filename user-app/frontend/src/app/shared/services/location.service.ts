import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, Subject } from 'rxjs';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationData extends Coordinates {
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp?: Date;
}

export interface Geofence {
  id: string;
  center: Coordinates;
  radiusKm: number;
  name?: string;
}

export interface Zone {
  id: string;
  name: string;
  coordinates: Coordinates[];
  deliveryFee: number;
  deliveryTimeMinutes: number;
}

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private currentLocation$ = new BehaviorSubject<LocationData | null>(null);
  private locationError$ = new Subject<string>();
  private watchId: number | null = null;
  private readonly EARTH_RADIUS_KM = 6371; // Earth's radius in kilometers

  // Mock zones for testing
  private zones: Zone[] = [
    {
      id: 'zone-1',
      name: 'Downtown Bangalore',
      coordinates: [
        { latitude: 12.9716, longitude: 77.5946 }, // Connaught Place
        { latitude: 12.9689, longitude: 77.6064 },
        { latitude: 12.9829, longitude: 77.6064 },
        { latitude: 12.9829, longitude: 77.5946 }
      ],
      deliveryFee: 20,
      deliveryTimeMinutes: 30
    },
    {
      id: 'zone-2',
      name: 'Indiranagar',
      coordinates: [
        { latitude: 12.9716, longitude: 77.6438 },
        { latitude: 12.9716, longitude: 77.6800 },
        { latitude: 13.0000, longitude: 77.6800 },
        { latitude: 13.0000, longitude: 77.6438 }
      ],
      deliveryFee: 30,
      deliveryTimeMinutes: 45
    },
    {
      id: 'zone-3',
      name: 'Whitefield',
      coordinates: [
        { latitude: 12.9698, longitude: 77.7499 },
        { latitude: 12.9698, longitude: 77.7900 },
        { latitude: 13.0050, longitude: 77.7900 },
        { latitude: 13.0050, longitude: 77.7499 }
      ],
      deliveryFee: 50,
      deliveryTimeMinutes: 60
    }
  ];

  constructor() {}

  /**
   * Get current location
   */
  getCurrentLocation(): Observable<LocationData | null> {
    return this.currentLocation$.asObservable();
  }

  /**
   * Get location errors
   */
  getLocationErrors(): Observable<string> {
    return this.locationError$.asObservable();
  }

  /**
   * Get current location synchronously
   */
  getCurrentLocationSync(): LocationData | null {
    return this.currentLocation$.getValue();
  }

  /**
   * Start watching location
   */
  startWatchingLocation(
    enableHighAccuracy: boolean = true,
    callback?: (location: LocationData) => void
  ): void {
    if (!navigator.geolocation) {
      this.locationError$.next('Geolocation is not supported by this browser');
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy,
      timeout: 10000,
      maximumAge: 0
    };

    this.watchId = navigator.geolocation.watchPosition(
      (position: GeolocationPosition) => {
        const location: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading ?? undefined,
          speed: position.coords.speed ?? undefined,
          timestamp: new Date()
        };

        this.currentLocation$.next(location);

        if (callback) {
          callback(location);
        }

        console.log('Location updated:', location);
      },
      (error: GeolocationPositionError) => {
        const errorMessage = this.getGeolocationErrorMessage(error.code);
        this.locationError$.next(errorMessage);
        console.error('Geolocation error:', errorMessage);
      },
      options
    );

    console.log('Started watching location');
  }

  /**
   * Stop watching location
   */
  stopWatchingLocation(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      console.log('Stopped watching location');
    }
  }

  /**
   * Get current position once
   */
  getPositionOnce(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject('Geolocation is not supported');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position: GeolocationPosition) => {
          const location: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading ?? undefined,
            speed: position.coords.speed ?? undefined,
            timestamp: new Date()
          };
          resolve(location);
        },
        (error: GeolocationPositionError) => {
          reject(this.getGeolocationErrorMessage(error.code));
        }
      );
    });
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
      Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return this.EARTH_RADIUS_KM * c;
  }

  /**
   * Calculate distance from current location to target
   */
  getDistanceFromCurrent(target: Coordinates): number | null {
    const current = this.getCurrentLocationSync();
    if (!current) {
      return null;
    }

    return this.calculateDistance(
      current.latitude,
      current.longitude,
      target.latitude,
      target.longitude
    );
  }

  /**
   * Find locations within radius from center
   */
  findNearby(center: Coordinates, radiusKm: number): any[] {
    // This would typically query a database
    // For mock purposes, returning empty array
    return [];
  }

  /**
   * Check if coordinates are within geofence
   */
  isWithinGeofence(coords: Coordinates, geofence: Geofence): boolean {
    const distance = this.calculateDistance(
      coords.latitude,
      coords.longitude,
      geofence.center.latitude,
      geofence.center.longitude
    );

    return distance <= geofence.radiusKm;
  }

  /**
   * Check if point is within polygon (using ray casting algorithm)
   */
  isPointInPolygon(point: Coordinates, polygon: Coordinates[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].longitude;
      const yi = polygon[i].latitude;
      const xj = polygon[j].longitude;
      const yj = polygon[j].latitude;

      const intersect =
        yi > point.latitude !== yj > point.latitude &&
        point.longitude < ((xj - xi) * (point.latitude - yi)) / (yj - yi) + xi;

      if (intersect) {
        inside = !inside;
      }
    }

    return inside;
  }

  /**
   * Get zone from coordinates
   */
  getZoneFromCoordinates(coords: Coordinates): Zone | null {
    for (const zone of this.zones) {
      if (this.isPointInPolygon(coords, zone.coordinates)) {
        return zone;
      }
    }
    return null;
  }

  /**
   * Get delivery fee for coordinates
   */
  getDeliveryFee(coords: Coordinates): number {
    const zone = this.getZoneFromCoordinates(coords);
    return zone ? zone.deliveryFee : 100; // Default fee if outside all zones
  }

  /**
   * Get delivery time estimate for coordinates
   */
  getDeliveryTimeEstimate(coords: Coordinates): number {
    const zone = this.getZoneFromCoordinates(coords);
    return zone ? zone.deliveryTimeMinutes : 120; // Default time if outside all zones
  }

  /**
   * Get all zones
   */
  getZones(): Zone[] {
    return [...this.zones];
  }

  /**
   * Add geofence (for tracking)
   */
  addGeofence(geofence: Geofence): void {
    console.log('Geofence added:', geofence);
  }

  /**
   * Remove geofence
   */
  removeGeofence(geofenceId: string): void {
    console.log('Geofence removed:', geofenceId);
  }

  /**
   * Mock: Set location for testing
   */
  mockSetLocation(location: LocationData): void {
    this.currentLocation$.next(location);
  }

  /**
   * Mock: Set error for testing
   */
  mockSetError(error: string): void {
    this.locationError$.next(error);
  }

  /**
   * Mock: Simulate location tracking
   */
  mockTrack(locations: LocationData[], intervalMs: number = 1000): void {
    let index = 0;

    const interval = setInterval(() => {
      if (index < locations.length) {
        this.currentLocation$.next(locations[index]);
        index++;
      } else {
        clearInterval(interval);
      }
    }, intervalMs);
  }

  /**
   * Calculate bearing between two points
   */
  calculateBearing(from: Coordinates, to: Coordinates): number {
    const dLon = this.toRad(to.longitude - from.longitude);
    const lat1 = this.toRad(from.latitude);
    const lat2 = this.toRad(to.latitude);

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

    return (this.toDeg(Math.atan2(y, x)) + 360) % 360;
  }

  /**
   * Estimate arrival time based on distance and speed
   */
  estimateArrivalTime(target: Coordinates, speedKmh: number = 20): number {
    const distance = this.getDistanceFromCurrent(target);
    if (!distance) {
      return 0;
    }

    return Math.round((distance / speedKmh) * 60); // Return in minutes
  }

  /**
   * Get midpoint between two coordinates
   */
  getMidpoint(coord1: Coordinates, coord2: Coordinates): Coordinates {
    const lat1 = this.toRad(coord1.latitude);
    const lon1 = this.toRad(coord1.longitude);
    const lat2 = this.toRad(coord2.latitude);
    const lon2 = this.toRad(coord2.longitude);

    const dLon = lon2 - lon1;

    const Bx = Math.cos(lat2) * Math.cos(dLon);
    const By = Math.cos(lat2) * Math.sin(dLon);

    const lat3 = Math.atan2(
      Math.sin(lat1) + Math.sin(lat2),
      Math.sqrt(
        (Math.cos(lat1) + Bx) * (Math.cos(lat1) + Bx) +
        By * By
      )
    );

    const lon3 =
      lon1 +
      Math.atan2(By, Math.cos(lat1) + Bx);

    return {
      latitude: this.toDeg(lat3),
      longitude: this.toDeg(lon3)
    };
  }

  /**
   * Private helper: Convert degrees to radians
   */
  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Private helper: Convert radians to degrees
   */
  private toDeg(radians: number): number {
    return (radians * 180) / Math.PI;
  }

  /**
   * Private helper: Get geolocation error message
   */
  private getGeolocationErrorMessage(code: number): string {
    switch (code) {
      case 1:
        return 'User denied access to geolocation';
      case 2:
        return 'Geolocation position unavailable';
      case 3:
        return 'Geolocation request timed out';
      default:
        return 'Unknown geolocation error';
    }
  }

  /**
   * Cleanup on service destroy
   */
  ngOnDestroy(): void {
    this.stopWatchingLocation();
  }
}
