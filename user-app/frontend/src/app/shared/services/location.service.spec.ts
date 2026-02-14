import { TestBed } from '@angular/core/testing';
import { LocationService, Coordinates, LocationData, Geofence } from './location.service';

describe('LocationService', () => {
  let service: LocationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LocationService]
    });

    service = TestBed.inject(LocationService);
  });

  afterEach(() => {
    service.stopWatchingLocation();
  });

  describe('Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should have no current location initially', () => {
      expect(service.getCurrentLocationSync()).toBeNull();
    });

    it('should provide current location as observable', (done) => {
      service.getCurrentLocation().subscribe(location => {
        expect(location === null || typeof location === 'object').toBe(true);
        done();
      });
    });
  });

  describe('Haversine Distance Calculation', () => {
    it('should calculate distance between two coordinates', () => {
      // New York (40.7128°N, 74.0060°W) to Boston (42.3601°N, 71.0589°W)
      // Approximate distance: ~360 km
      const distance = service.calculateDistance(
        40.7128, -74.0060,
        42.3601, -71.0589
      );

      expect(distance).toBeGreaterThan(300);
      expect(distance).toBeLessThan(400);
    });

    it('should return 0 for same coordinates', () => {
      const distance = service.calculateDistance(
        40.7128, -74.0060,
        40.7128, -74.0060
      );

      expect(distance).toBe(0);
    });

    it('should calculate antipodal points correctly', () => {
      // Distance from North Pole to South Pole should be ~20015 km
      const distance = service.calculateDistance(
        90, 0,    // North Pole
        -90, 0    // South Pole
      );

      expect(distance).toBeGreaterThan(19000);
      expect(distance).toBeLessThan(21000);
    });

    it('should be symmetric (distance A→B equals B→A)', () => {
      const distance1 = service.calculateDistance(40.7128, -74.0060, 42.3601, -71.0589);
      const distance2 = service.calculateDistance(42.3601, -71.0589, 40.7128, -74.0060);

      expect(Math.abs(distance1 - distance2)).toBeLessThan(0.1);
    });

    it('should handle negative coordinates', () => {
      const distance = service.calculateDistance(
        -33.8688, 151.2093,  // Sydney
        -37.8136, 144.9631   // Melbourne
      );

      expect(distance).toBeGreaterThan(500);
      expect(distance).toBeLessThan(800);
    });

    it('should handle Bangalore coordinates', () => {
      // Bangalore city corners (approximate)
      const distance = service.calculateDistance(
        12.9716, 77.5946,  // Center
        13.0827, 77.6480   // Different point
      );

      expect(distance).toBeGreaterThan(5);
      expect(distance).toBeLessThan(20);
    });
  });

  describe('Distance from Current Location', () => {
    it('should calculate distance from current location', () => {
      const current: LocationData = {
        latitude: 12.9716,
        longitude: 77.5946
      };

      service.mockSetLocation(current);

      const target: Coordinates = {
        latitude: 13.0827,
        longitude: 77.6480
      };

      const distance = service.getDistanceFromCurrent(target);
      expect(distance).toBeGreaterThan(5);
      expect(distance).toBeLessThan(20);
    });

    it('should return null if no current location', () => {
      const target: Coordinates = {
        latitude: 13.0827,
        longitude: 77.6480
      };

      const distance = service.getDistanceFromCurrent(target);
      expect(distance).toBeNull();
    });
  });

  describe('Geofence Checking', () => {
    it('should check if point is within geofence', () => {
      const point: Coordinates = {
        latitude: 12.9716,
        longitude: 77.5946
      };

      const geofence: Geofence = {
        id: 'test-geofence',
        center: { latitude: 12.9716, longitude: 77.5946 },
        radiusKm: 5
      };

      expect(service.isWithinGeofence(point, geofence)).toBe(true);
    });

    it('should return false if point is outside geofence', () => {
      const point: Coordinates = {
        latitude: 12.9716,
        longitude: 77.5946
      };

      const geofence: Geofence = {
        id: 'test-geofence',
        center: { latitude: 12.9716, longitude: 77.5946 },
        radiusKm: 0.1 // 100 meters
      };

      expect(service.isWithinGeofence(point, geofence)).toBe(false);
    });

    it('should handle large geofences', () => {
      const point: Coordinates = {
        latitude: 12.9716,
        longitude: 77.5946
      };

      const geofence: Geofence = {
        id: 'large-geofence',
        center: { latitude: 12.9716, longitude: 77.5946 },
        radiusKm: 50
      };

      expect(service.isWithinGeofence(point, geofence)).toBe(true);
    });
  });

  describe('Polygon Geofencing (Point-in-Polygon)', () => {
    it('should detect point inside polygon', () => {
      const point: Coordinates = {
        latitude: 12.98,
        longitude: 77.60
      };

      const polygon: Coordinates[] = [
        { latitude: 12.97, longitude: 77.59 },
        { latitude: 12.97, longitude: 77.61 },
        { latitude: 12.99, longitude: 77.61 },
        { latitude: 12.99, longitude: 77.59 }
      ];

      expect(service.isPointInPolygon(point, polygon)).toBe(true);
    });

    it('should detect point outside polygon', () => {
      const point: Coordinates = {
        latitude: 13.10,
        longitude: 77.80
      };

      const polygon: Coordinates[] = [
        { latitude: 12.97, longitude: 77.59 },
        { latitude: 12.97, longitude: 77.61 },
        { latitude: 12.99, longitude: 77.61 },
        { latitude: 12.99, longitude: 77.59 }
      ];

      expect(service.isPointInPolygon(point, polygon)).toBe(false);
    });

    it('should handle point on polygon edge', () => {
      const point: Coordinates = {
        latitude: 12.97,
        longitude: 77.60
      };

      const polygon: Coordinates[] = [
        { latitude: 12.97, longitude: 77.59 },
        { latitude: 12.97, longitude: 77.61 },
        { latitude: 12.99, longitude: 77.61 },
        { latitude: 12.99, longitude: 77.59 }
      ];

      // Edge cases may vary, but should return a boolean
      const result = service.isPointInPolygon(point, polygon);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Zone Management', () => {
    it('should get zone from coordinates', () => {
      const bangaloreCoords: Coordinates = {
        latitude: 12.97,
        longitude: 77.60
      };

      const zone = service.getZoneFromCoordinates(bangaloreCoords);
      expect(zone).toBeDefined();
      expect(zone?.name).toBeDefined();
    });

    it('should return null for coordinates outside all zones', () => {
      const outsideCoords: Coordinates = {
        latitude: 15.0,
        longitude: 75.0
      };

      const zone = service.getZoneFromCoordinates(outsideCoords);
      expect(zone).toBeNull();
    });

    it('should get delivery fee for zone', () => {
      const bangaloreCoords: Coordinates = {
        latitude: 12.97,
        longitude: 77.60
      };

      const fee = service.getDeliveryFee(bangaloreCoords);
      expect(fee).toBeGreaterThan(0);
    });

    it('should return default delivery fee for coordinates outside zones', () => {
      const outsideCoords: Coordinates = {
        latitude: 15.0,
        longitude: 75.0
      };

      const fee = service.getDeliveryFee(outsideCoords);
      expect(fee).toBe(100); // Default fee
    });

    it('should get delivery time estimate', () => {
      const bangaloreCoords: Coordinates = {
        latitude: 12.97,
        longitude: 77.60
      };

      const time = service.getDeliveryTimeEstimate(bangaloreCoords);
      expect(time).toBeGreaterThan(0);
    });

    it('should return default delivery time outside zones', () => {
      const outsideCoords: Coordinates = {
        latitude: 15.0,
        longitude: 75.0
      };

      const time = service.getDeliveryTimeEstimate(outsideCoords);
      expect(time).toBe(120); // Default time
    });

    it('should get all zones', () => {
      const zones = service.getZones();
      expect(zones).toBeDefined();
      expect(Array.isArray(zones)).toBe(true);
      expect(zones.length).toBeGreaterThan(0);
    });
  });

  describe('Bearing Calculation', () => {
    it('should calculate bearing between two points', () => {
      const from: Coordinates = { latitude: 40.7128, longitude: -74.0060 };
      const to: Coordinates = { latitude: 42.3601, longitude: -71.0589 };

      const bearing = service.calculateBearing(from, to);
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThanOrEqual(360);
    });

    it('should calculate bearing to north as 0°', () => {
      const from: Coordinates = { latitude: 0, longitude: 0 };
      const to: Coordinates = { latitude: 1, longitude: 0 };

      const bearing = service.calculateBearing(from, to);
      expect(Math.abs(bearing)).toBeLessThan(1); // Should be close to 0
    });

    it('should calculate bearing to east as 90°', () => {
      const from: Coordinates = { latitude: 0, longitude: 0 };
      const to: Coordinates = { latitude: 0, longitude: 1 };

      const bearing = service.calculateBearing(from, to);
      expect(Math.abs(bearing - 90)).toBeLessThan(1); // Should be close to 90
    });
  });

  describe('Arrival Time Estimation', () => {
    it('should estimate arrival time', () => {
      const current: LocationData = {
        latitude: 12.9716,
        longitude: 77.5946
      };

      service.mockSetLocation(current);

      const target: Coordinates = {
        latitude: 13.0827,
        longitude: 77.6480
      };

      const time = service.estimateArrivalTime(target, 30); // 30 km/h
      expect(time).toBeGreaterThan(0);
    });

    it('should use default speed of 20 km/h', () => {
      const current: LocationData = {
        latitude: 12.9716,
        longitude: 77.5946
      };

      service.mockSetLocation(current);

      const target: Coordinates = {
        latitude: 13.0827,
        longitude: 77.6480
      };

      const time = service.estimateArrivalTime(target);
      expect(time).toBeGreaterThan(0);
    });

    it('should return 0 if no current location', () => {
      const target: Coordinates = {
        latitude: 13.0827,
        longitude: 77.6480
      };

      const time = service.estimateArrivalTime(target);
      expect(time).toBe(0);
    });
  });

  describe('Midpoint Calculation', () => {
    it('should calculate midpoint between two coordinates', () => {
      const coord1: Coordinates = { latitude: 0, longitude: 0 };
      const coord2: Coordinates = { latitude: 0, longitude: 10 };

      const midpoint = service.getMidpoint(coord1, coord2);
      expect(midpoint.latitude).toBeDefined();
      expect(midpoint.longitude).toBeDefined();
      expect(midpoint.longitude).toBeCloseTo(5, 0);
    });

    it('should calculate midpoint for same coordinates', () => {
      const coord1: Coordinates = { latitude: 12.9716, longitude: 77.5946 };
      const coord2: Coordinates = { latitude: 12.9716, longitude: 77.5946 };

      const midpoint = service.getMidpoint(coord1, coord2);
      expect(midpoint.latitude).toBeCloseTo(12.9716, 2);
      expect(midpoint.longitude).toBeCloseTo(77.5946, 2);
    });
  });

  describe('Mock Methods (for testing)', () => {
    it('should mock set location', (done) => {
      const location: LocationData = {
        latitude: 12.9716,
        longitude: 77.5946,
        accuracy: 10,
        timestamp: new Date()
      };

      service.getCurrentLocation().subscribe(currentLoc => {
        if (currentLoc) {
          expect(currentLoc.latitude).toBe(12.9716);
          expect(currentLoc.longitude).toBe(77.5946);
          done();
        }
      });

      service.mockSetLocation(location);
    });

    it('should mock set error', (done) => {
      service.getLocationErrors().subscribe(error => {
        expect(error).toBe('Permission denied');
        done();
      });

      service.mockSetError('Permission denied');
    });

    it('should mock track location with multiple points', (done) => {
      const locations: LocationData[] = [
        { latitude: 12.97, longitude: 77.59 },
        { latitude: 12.98, longitude: 77.60 },
        { latitude: 12.99, longitude: 77.61 }
      ];

      let receivedCount = 0;

      service.getCurrentLocation().subscribe(location => {
        if (location) {
          receivedCount++;
          if (receivedCount === 3) {
            expect(location.latitude).toBe(12.99);
            done();
          }
        }
      });

      service.mockTrack(locations, 100);
    });
  });

  describe('Geofence Management', () => {
    it('should add geofence', () => {
      const geofence: Geofence = {
        id: 'test-geofence',
        center: { latitude: 12.9716, longitude: 77.5946 },
        radiusKm: 5,
        name: 'Test Area'
      };

      expect(() => service.addGeofence(geofence)).not.toThrow();
    });

    it('should remove geofence', () => {
      expect(() => service.removeGeofence('test-geofence')).not.toThrow();
    });
  });

  describe('Location Watching', () => {
    it('should start watching location', () => {
      spyOn(navigator.geolocation, 'watchPosition').and.returnValue(1);
      service.startWatchingLocation();

      expect(navigator.geolocation.watchPosition).toHaveBeenCalled();
    });

    it('should stop watching location', () => {
      spyOn(navigator.geolocation, 'clearWatch');
      service.stopWatchingLocation();

      expect(navigator.geolocation.clearWatch).toHaveBeenCalled();
    });

    it('should handle geolocation not supported', (done) => {
      spyOn(navigator.geolocation, 'watchPosition').and.throwError('Not supported');
      service.getLocationErrors().subscribe(error => {
        expect(error).toBeDefined();
      });

      service.startWatchingLocation();
      done();
    });

    it('should call callback on location update', () => {
      const callback = jasmine.createSpy('callback');
      spyOn(navigator.geolocation, 'watchPosition').and.callFake((
        success: PositionCallback
      ) => {
        const mockPosition: GeolocationPosition = {
          coords: {
            latitude: 12.9716,
            longitude: 77.5946,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null
          },
          timestamp: Date.now()
        };

        success(mockPosition);
        return 1;
      });

      service.startWatchingLocation(true, callback);

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle extreme latitude/longitude values', () => {
      const distance = service.calculateDistance(
        89.9, 179.9,  // Near north pole, dateline
        -89.9, -179.9  // Near south pole, dateline
      );

      expect(distance).toBeGreaterThan(0);
      expect(typeof distance).toBe('number');
    });

    it('should handle very small distances', () => {
      const distance = service.calculateDistance(
        12.9716, 77.5946,
        12.97160001, 77.59460001
      );

      expect(distance).toBeLessThan(0.001);
      expect(distance).toBeGreaterThanOrEqual(0);
    });

    it('should handle negative bearing values', () => {
      const bearing = service.calculateBearing(
        { latitude: 40.7128, longitude: -74.0060 },
        { latitude: 42.3601, longitude: -71.0589 }
      );

      // Bearing should always be 0-360
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThanOrEqual(360);
    });

    it('should handle very large speed values in time estimation', () => {
      const current: LocationData = {
        latitude: 12.9716,
        longitude: 77.5946
      };

      service.mockSetLocation(current);

      const time = service.estimateArrivalTime(
        { latitude: 13.0827, longitude: 77.6480 },
        1000 // Very high speed
      );

      expect(time).toBeGreaterThanOrEqual(0);
    });

    it('should handle polygon with single point', () => {
      const point: Coordinates = { latitude: 12.97, longitude: 77.60 };
      const polygon: Coordinates[] = [{ latitude: 12.97, longitude: 77.59 }];

      const result = service.isPointInPolygon(point, polygon);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Integration Scenarios', () => {
    it('should complete full tracking workflow', (done) => {
      const startLocation: LocationData = {
        latitude: 12.9716,
        longitude: 77.5946
      };

      service.mockSetLocation(startLocation);

      const target: Coordinates = {
        latitude: 13.0827,
        longitude: 77.6480
      };

      const distance = service.getDistanceFromCurrent(target);
      const bearing = service.calculateBearing(startLocation, target);
      const time = service.estimateArrivalTime(target, 30);
      const zone = service.getZoneFromCoordinates(target);

      expect(distance).toBeGreaterThan(0);
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(time).toBeGreaterThan(0);

      done();
    });

    it('should handle route planning with multiple waypoints', () => {
      const waypoints: Coordinates[] = [
        { latitude: 12.9716, longitude: 77.5946 },
        { latitude: 12.97, longitude: 77.60 },
        { latitude: 12.98, longitude: 77.61 }
      ];

      let totalDistance = 0;
      for (let i = 0; i < waypoints.length - 1; i++) {
        const dist = service.calculateDistance(
          waypoints[i].latitude, waypoints[i].longitude,
          waypoints[i + 1].latitude, waypoints[i + 1].longitude
        );
        totalDistance += dist;
      }

      expect(totalDistance).toBeGreaterThan(0);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup on service destroy', () => {
      spyOn(navigator.geolocation, 'clearWatch');
      service.ngOnDestroy();

      expect(navigator.geolocation.clearWatch).toHaveBeenCalled();
    });
  });
});
