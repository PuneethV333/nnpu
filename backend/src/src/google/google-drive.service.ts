import { Injectable, OnModuleInit } from '@nestjs/common';
import { google } from 'googleapis';
import { GoogleAuthService } from './google-auth.service';

@Injectable()
export class GoogleDriveService implements OnModuleInit {
  private drive!: ReturnType<typeof google.drive>;

  constructor(private readonly googleAuth: GoogleAuthService) {}

  onModuleInit() {
    this.drive = google.drive({
      version: 'v3',
      auth: this.googleAuth.getClient(),
    });
  }

  async moveToFolder(fileId: string, folderId: string) {
    // Forms API creates the form in the user's Drive root by default —
    // this moves it into a dedicated folder, e.g. "Enrollment Drives 2026"
    const file = await this.drive.files.get({ fileId, fields: 'parents' });
    const previousParents = file.data.parents?.join(',');

    return this.drive.files.update({
      fileId,
      addParents: folderId,
      removeParents: previousParents,
      fields: 'id, parents',
    });
  }
}
