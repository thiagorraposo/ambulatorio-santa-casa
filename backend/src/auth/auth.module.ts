import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AppConfig } from '../config/app.config';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { PerfisGuard } from './perfis.guard';

@Module({
  imports: [JwtModule.registerAsync({ inject: [ConfigService], useFactory: (config: ConfigService<AppConfig, true>) => ({
    secret: config.get('auth.jwtSecret', { infer: true }),
    signOptions: { expiresIn: config.get('auth.jwtExpiresInSeconds', { infer: true }) },
  }) })],
  controllers: [AuthController],
  providers: [AuthRepository, AuthService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: PerfisGuard }],
  exports: [AuthService],
})
export class AuthModule {}

