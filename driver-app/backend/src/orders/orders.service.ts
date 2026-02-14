import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { LocationService } from '../location/location.service';

export interface OrderOffer {
  orderId: string;
  userId: string;
  items: Array<{ productId: string; name: string; quantity: number }>;
  totalAmount: number;
  deliveryAddress: {
    address: string;
    latitude: number;
    longitude: number;
  };
  pickupAddress: {
    address: string;
    latitude: number;
    longitude: number;
  };
  estimatedDistance: number;
  deliveryFee: number;
  expiresAt: Date;
}

export interface ActiveDelivery {
  orderId: string;
  driverId: string;
  status: 'accepted' | 'picked_up' | 'on_the_way' | 'arrived' | 'delivered';
  userId: string;
  items: Array<{ productId: string; name: string; quantity: number }>;
  totalAmount: number;
  deliveryAddress: {
    address: string;
    latitude: number;
    longitude: number;
  };
  pickupAddress: {
    address: string;
    latitude: number;
    longitude: number;
  };
  deliveryFee: number;
  acceptedAt: Date;
  pickedUpAt?: Date;
  deliveredAt?: Date;
}

@Injectable()
export class DriverOrdersService {
  private pendingOffers = new Map<string, Map<string, OrderOffer>>(); // driverId -> (orderId -> offer)
  private activeDeliveries = new Map<string, ActiveDelivery>(); // driverId -> active delivery

  constructor(private locationService: LocationService) {}

  /**
   * Add order offer for a specific driver
   * Called by Kafka consumer when a new order is created
   */
  addOrderOffer(driverId: string, offer: OrderOffer): void {
    if (!this.pendingOffers.has(driverId)) {
      this.pendingOffers.set(driverId, new Map());
    }
    this.pendingOffers.get(driverId).set(offer.orderId, offer);

    // Auto-expire after 60 seconds
    setTimeout(() => {
      this.pendingOffers.get(driverId)?.delete(offer.orderId);
    }, 60000);
  }

  /**
   * Get all pending order offers for a driver
   */
  getPendingOffers(driverId: string): OrderOffer[] {
    const offers = this.pendingOffers.get(driverId);
    if (!offers) return [];
    // Filter out expired offers
    const now = new Date();
    const valid: OrderOffer[] = [];
    for (const [orderId, offer] of offers) {
      if (offer.expiresAt > now) {
        valid.push(offer);
      } else {
        offers.delete(orderId);
      }
    }
    return valid;
  }

  /**
   * Driver accepts an order offer
   */
  async acceptOrder(driverId: string, orderId: string): Promise<ActiveDelivery> {
    // Check driver doesn't have active delivery
    if (this.activeDeliveries.has(driverId)) {
      throw new BadRequestException('You already have an active delivery');
    }

    const offers = this.pendingOffers.get(driverId);
    const offer = offers?.get(orderId);
    if (!offer) {
      throw new NotFoundException('Order offer not found or expired');
    }

    // Create active delivery
    const delivery: ActiveDelivery = {
      orderId: offer.orderId,
      driverId,
      status: 'accepted',
      userId: offer.userId,
      items: offer.items,
      totalAmount: offer.totalAmount,
      deliveryAddress: offer.deliveryAddress,
      pickupAddress: offer.pickupAddress,
      deliveryFee: offer.deliveryFee,
      acceptedAt: new Date(),
    };

    this.activeDeliveries.set(driverId, delivery);
    offers.delete(orderId);

    // Clear remaining offers for this driver
    this.pendingOffers.delete(driverId);

    // Update status in Redis cache
    await this.locationService.setOrderStatus(orderId, 'assigned');

    return delivery;
  }

  /**
   * Driver rejects an order offer
   */
  rejectOrder(driverId: string, orderId: string): { rejected: boolean } {
    const offers = this.pendingOffers.get(driverId);
    if (!offers?.has(orderId)) {
      throw new NotFoundException('Order offer not found');
    }
    offers.delete(orderId);
    return { rejected: true };
  }

  /**
   * Get driver's current active delivery
   */
  getActiveDelivery(driverId: string): ActiveDelivery | null {
    return this.activeDeliveries.get(driverId) || null;
  }

  /**
   * Update delivery status
   */
  async updateDeliveryStatus(
    driverId: string,
    status: 'picked_up' | 'on_the_way' | 'arrived' | 'delivered',
  ): Promise<ActiveDelivery> {
    const delivery = this.activeDeliveries.get(driverId);
    if (!delivery) {
      throw new NotFoundException('No active delivery found');
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      accepted: ['picked_up'],
      picked_up: ['on_the_way'],
      on_the_way: ['arrived'],
      arrived: ['delivered'],
    };

    if (!validTransitions[delivery.status]?.includes(status)) {
      throw new BadRequestException(
        `Cannot transition from '${delivery.status}' to '${status}'`,
      );
    }

    delivery.status = status;

    if (status === 'picked_up') delivery.pickedUpAt = new Date();
    if (status === 'delivered') {
      delivery.deliveredAt = new Date();
      // Remove from active deliveries after marking delivered
      this.activeDeliveries.delete(driverId);
    }

    // Update Redis cache
    await this.locationService.setOrderStatus(delivery.orderId, status);

    return delivery;
  }
}
