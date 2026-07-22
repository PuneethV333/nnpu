import { Injectable, OnModuleInit } from '@nestjs/common';
import { google } from 'googleapis';
import { GoogleAuthService } from './google-auth.service';

@Injectable()
export class GoogleFormsService implements OnModuleInit {
  private forms!: ReturnType<typeof google.forms>;

  constructor(private readonly googleAuth: GoogleAuthService) {}

  onModuleInit() {
    this.forms = google.forms({
      version: 'v1',
      auth: this.googleAuth.getClient(),
    });
  }

  async createForm(title: string) {
    const res = await this.forms.forms.create({
      requestBody: { info: { title } },
    });
    return res.data;
  }

  async addQuestions(formId: string, requests: any[]) {
    return this.forms.forms.batchUpdate({
      formId,
      requestBody: { requests },
    });
  }

  async listResponses(formId: string) {
    const res = await this.forms.forms.responses.list({ formId });
    return res.data.responses ?? [];
  }
}
