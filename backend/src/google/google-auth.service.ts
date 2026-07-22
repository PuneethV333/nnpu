import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';

@Injectable()
export class GoogleAuthService implements OnModuleInit {
  private oauth2Client!: InstanceType<typeof google.auth.OAuth2>;
  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.oauth2Client = new google.auth.OAuth2(
      this.config.get<string>('CLIENT_ID'),
      this.config.get<string>('CLIENT_SECRET'),
    );

    this.oauth2Client.setCredentials({
      refresh_token: this.config.get<string>('REFRESH_TOKEN'),
    });
  }

  getClient() {
    return this.oauth2Client;
  }
}
