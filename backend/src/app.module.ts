import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import Joi from 'joi';
import { AuthModuleOptions } from '@nestjs/passport';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
        JWT_ACCESS_SECRET: Joi.string().required(),
        JWT_ACCESS_EXPIRES_IN: Joi.string().required(),
        JWT_REFRESH_SECRET: Joi.string().required(),
        JWT_REFRESH_EXPIRES_IN: Joi.string().required(),
        PORT: Joi.number().default(5000),
        NODE_ENV: Joi.string().required(),
      }),
    }),
    AuthModuleOptions,
    // UsersModule, AuthModule,
    AuthModule,
    // ... other feature modules
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
