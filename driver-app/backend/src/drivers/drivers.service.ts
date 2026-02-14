import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver } from './entities/driver.entity';
import { DriverEarning } from './entities/driver-earning.entity';
import { LocationService } from '../location/location.service';

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(Driver) private driverRepo: Repository<Driver>,
    @InjectRepository(DriverEarning) private earningRepo: Repository<DriverEarning>,
    private locationService: LocationService,
  ) {}

  async getProfile(driverId: string) {
    const driver = await this.driverRepo.findOne({ where: { id: driverId } });
    if (!driver) throw new NotFoundException('Driver not found');
    const { password_hash, ...result } = driver;
    return result;
  }

  async updateProfile(driverId: string, dto: Partial<Driver>) {
    delete dto.password_hash;
    delete dto.id;
    await this.driverRepo.update(driverId, dto);
    return this.getProfile(driverId);
  }

  async toggleAvailability(driverId: string, is_available: boolean, latitude?: number, longitude?: number) {
    await this.driverRepo.update(driverId, { is_available });

    if (is_available && latitude && longitude) {
      // Add driver to Redis GEO set for proximity queries
      await this.locationService.updateDriverLocation(driverId, latitude, longitude);
    } else if (!is_available) {
      await this.locationService.removeDriverLocation(driverId);
    }

    return { is_available };
  }

  async getEarnings(driverId: string, period?: string) {
    const query = this.earningRepo.createQueryBuilder('e')
      .where('e.driver_id = :driverId', { driverId });

    if (period === 'today') {
      query.andWhere('e.created_at >= CURRENT_DATE');
    } else if (period === 'week') {
      query.andWhere("e.created_at >= CURRENT_DATE - INTERVAL '7 days'");
    } else if (period === 'month') {
      query.andWhere("e.created_at >= CURRENT_DATE - INTERVAL '30 days'");
    }

    const earnings = await query.orderBy('e.created_at', 'DESC').getMany();
    const total = earnings.reduce((sum, e) => sum + Number(e.amount), 0);

    return { earnings, total, count: earnings.length };
  }

  async addEarning(driverId: string, orderId: string, amount: number) {
    const earning = this.earningRepo.create({
      driver_id: driverId,
      order_id: orderId,
      amount,
      status: 'completed',
    });
    await this.earningRepo.save(earning);

    // Update total earnings on driver
    await this.driverRepo.increment({ id: driverId }, 'total_earnings', amount);
    await this.driverRepo.increment({ id: driverId }, 'total_deliveries', 1);

    return earning;
  }
}
