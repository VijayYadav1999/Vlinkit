import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env.development'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DATABASE_HOST', 'localhost'),
        port: config.get<number>('DATABASE_PORT', 5432),
        username: config.get('DATABASE_USER', 'vlinkit_user'),
        password: config.get('DATABASE_PASSWORD', 'vlinkit_password_dev'),
        database: config.get('DATABASE_NAME', 'vlinkit_db'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: config.get('DATABASE_SYNCHRONIZE', 'true') === 'true',
        logging: config.get('DATABASE_LOGGING', 'false') === 'true',
        ssl: config.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
        extra: {
          family: 4,
        },
      }),
    }),
    AuthModule,
    UsersModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
