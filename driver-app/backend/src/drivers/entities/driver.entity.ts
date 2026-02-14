import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('drivers')
export class Driver {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  phone: string;

  @Column()
  password_hash: string;

  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @Column({ nullable: true })
  profile_image_url: string;

  @Column({ default: 'bike' })
  vehicle_type: string;

  @Column({ nullable: true })
  vehicle_number: string;

  @Column({ nullable: true })
  license_number: string;

  @Column({ default: false })
  is_available: boolean;

  @Column({ default: false })
  is_verified: boolean;

  @Column({ default: true })
  is_active: boolean;

  @Column('decimal', { precision: 3, scale: 2, default: 5.0 })
  rating: number;

  @Column({ default: 0 })
  total_deliveries: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  total_earnings: number;

  @Column({ nullable: true })
  fleet_engine_vehicle_id: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
