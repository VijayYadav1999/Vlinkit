import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { Driver } from '../drivers/entities/driver.entity';
import { RefreshToken } from './entities/refresh-token.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Driver) private driverRepo: Repository<Driver>,
    @InjectRepository(RefreshToken) private refreshTokenRepo: Repository<RefreshToken>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: {
    email: string; phone: string; password: string;
    first_name: string; last_name: string;
    vehicle_type?: string; vehicle_number?: string; license_number?: string;
  }) {
    const existing = await this.driverRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const password_hash = await bcrypt.hash(dto.password, 12);
    const { password, ...rest } = dto;
    const driver = this.driverRepo.create({
      ...rest,
      password_hash,
    });
    await this.driverRepo.save(driver);

    const tokens = await this.generateTokens(driver);
    return { driver: this.sanitize(driver), ...tokens };
  }

  async login(dto: { email: string; password: string }) {
    const driver = await this.driverRepo.findOne({ where: { email: dto.email } });
    if (!driver) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, driver.password_hash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.generateTokens(driver);
    return { driver: this.sanitize(driver), ...tokens };
  }

  async refreshToken(tokenStr: string) {
    const stored = await this.refreshTokenRepo.findOne({
      where: { token: tokenStr, is_revoked: false },
    });
    if (!stored || stored.expires_at < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const driver = await this.driverRepo.findOne({ where: { id: stored.driver_id } });
    if (!driver) throw new UnauthorizedException('Driver not found');

    stored.is_revoked = true;
    await this.refreshTokenRepo.save(stored);

    const tokens = await this.generateTokens(driver);
    return { driver: this.sanitize(driver), ...tokens };
  }

  async validateDriver(driverId: string): Promise<Driver> {
    const driver = await this.driverRepo.findOne({ where: { id: driverId } });
    if (!driver) throw new UnauthorizedException('Driver not found');
    return driver;
  }

  private async generateTokens(driver: Driver) {
    const payload = { sub: driver.id, email: driver.email, type: 'driver' };
    const access_token = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET', 'dev-secret'),
      expiresIn: '24h',
    });

    const refresh_token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.refreshTokenRepo.save({
      driver_id: driver.id,
      token: refresh_token,
      expires_at: expiresAt,
    });

    return { access_token, refresh_token };
  }

  private sanitize(driver: Driver) {
    const { password_hash, ...result } = driver;
    return result;
  }
}
