import { Module } from '@nestjs/common';
import { CombinationsService } from './combinations.service';
import { CombinationsController } from './combinations.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CombinationsController],
  providers: [CombinationsService],
})
export class CombinationsModule {}
