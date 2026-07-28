import { Module } from '@nestjs/common';
import { FirebaseService } from './firebase.service';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '@/logger/logger.module';

@Module({
  imports: [ConfigModule, LoggerModule],
  providers: [FirebaseService],
  exports: [FirebaseService],
})
export class FirebaseModule {}
