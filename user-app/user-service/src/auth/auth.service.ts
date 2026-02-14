import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterDto, LoginDto, GoogleAuthDto } from '../common/dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(RefreshToken) private refreshTokenRepo: Repository<RefreshToken>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const password_hash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepo.create({ ...dto, password_hash });
    await this.userRepo.save(user);

    const tokens = await this.generateTokens(user);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user || !user.password_hash) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.password_hash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.generateTokens(user);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async googleAuth(dto: GoogleAuthDto) {
    // In production, verify the Google token with Google's API
    // For now, we decode it as a mock payload
    let payload: any;
    try {
      // Use Google Auth Library to verify token in production
      // const ticket = await client.verifyIdToken({ idToken: dto.token });
      // payload = ticket.getPayload();
      payload = {
        sub: 'google_' + Date.now(),
        email: `user_${Date.now()}@gmail.com`,
        given_name: 'Google',
        family_name: 'User',
        picture: null,
      };
    } catch (err) {
      throw new UnauthorizedException('Invalid Google token');
    }

    let user = await this.userRepo.findOne({ where: { google_id: payload.sub } });
    if (!user) {
      user = await this.userRepo.findOne({ where: { email: payload.email } });
      if (user) {
        user.google_id = payload.sub;
        user.google_email = payload.email;
        await this.userRepo.save(user);
      } else {
        user = this.userRepo.create({
          email: payload.email,
          google_id: payload.sub,
          google_email: payload.email,
          first_name: payload.given_name || 'User',
          last_name: payload.family_name || '',
          profile_image_url: payload.picture,
          is_verified: true,
        });
        await this.userRepo.save(user);
      }
    }

    const tokens = await this.generateTokens(user);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async refreshToken(refreshTokenStr: string) {
    const storedToken = await this.refreshTokenRepo.findOne({
      where: { token: refreshTokenStr, is_revoked: false },
    });
    if (!storedToken || storedToken.expires_at < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.userRepo.findOne({ where: { id: storedToken.user_id } });
    if (!user) throw new UnauthorizedException('User not found');

    // Revoke old token
    storedToken.is_revoked = true;
    await this.refreshTokenRepo.save(storedToken);

    const tokens = await this.generateTokens(user);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async validateUser(userId: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }

  private async generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email, type: 'user' };

    const access_token = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET', 'dev-secret'),
      expiresIn: this.configService.get('JWT_EXPIRATION', '24h'),
    });

    const refresh_token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.refreshTokenRepo.save({
      user_id: user.id,
      token: refresh_token,
      expires_at: expiresAt,
    });

    return { access_token, refresh_token };
  }

  private sanitizeUser(user: User) {
    const { password_hash, ...result } = user;
    return result;
  }
}
