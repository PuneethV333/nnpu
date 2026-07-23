// google.module.ts
import { Module } from '@nestjs/common';
import { GoogleAuthService } from './google-auth.service';
import { GoogleDriveService } from './google-drive.service';
import { GoogleFormsService } from './google-forms.service';

@Module({
  providers: [GoogleAuthService, GoogleDriveService, GoogleFormsService],
  exports: [GoogleAuthService, GoogleDriveService, GoogleFormsService],
})
export class GoogleModule {}
