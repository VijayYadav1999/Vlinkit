import {
  Controller, Get, Put, Post, Delete, Body, Param, UseGuards, Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateProfileDto, CreateAddressDto, UpdateAddressDto } from '../common/dto';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('profile')
  getProfile(@Request() req) {
    return this.usersService.getProfile(req.user.id);
  }

  @Put('profile')
  updateProfile(@Request() req, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.id, dto);
  }

  @Get('addresses')
  getAddresses(@Request() req) {
    return this.usersService.getAddresses(req.user.id);
  }

  @Post('addresses')
  createAddress(@Request() req, @Body() dto: CreateAddressDto) {
    return this.usersService.createAddress(req.user.id, dto);
  }

  @Put('addresses/:id')
  updateAddress(@Request() req, @Param('id') id: string, @Body() dto: UpdateAddressDto) {
    return this.usersService.updateAddress(req.user.id, id, dto);
  }

  @Delete('addresses/:id')
  deleteAddress(@Request() req, @Param('id') id: string) {
    return this.usersService.deleteAddress(req.user.id, id);
  }
}
