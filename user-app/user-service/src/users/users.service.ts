import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserAddress } from './entities/user-address.entity';
import { UpdateProfileDto, CreateAddressDto, UpdateAddressDto } from '../common/dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(UserAddress) private addressRepo: Repository<UserAddress>,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['addresses'],
    });
    if (!user) throw new NotFoundException('User not found');
    const { password_hash, ...result } = user;
    return result;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    await this.userRepo.update(userId, dto);
    return this.getProfile(userId);
  }

  async getAddresses(userId: string) {
    return this.addressRepo.find({
      where: { user_id: userId },
      order: { is_default: 'DESC', created_at: 'DESC' },
    });
  }

  async createAddress(userId: string, dto: CreateAddressDto) {
    if (dto.is_default) {
      await this.addressRepo.update({ user_id: userId }, { is_default: false });
    }
    const address = this.addressRepo.create({ ...dto, user_id: userId });
    return this.addressRepo.save(address);
  }

  async updateAddress(userId: string, addressId: string, dto: UpdateAddressDto) {
    const address = await this.addressRepo.findOne({
      where: { id: addressId, user_id: userId },
    });
    if (!address) throw new NotFoundException('Address not found');

    if (dto.is_default) {
      await this.addressRepo.update({ user_id: userId }, { is_default: false });
    }
    Object.assign(address, dto);
    return this.addressRepo.save(address);
  }

  async deleteAddress(userId: string, addressId: string) {
    const result = await this.addressRepo.delete({ id: addressId, user_id: userId });
    if (result.affected === 0) throw new NotFoundException('Address not found');
    return { deleted: true };
  }
}
