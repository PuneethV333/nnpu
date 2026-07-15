/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '@/prisma/prisma.service';
import { LoggerService } from '@/logger/logger.service';
import { NotificationService } from '@/notification/notification.service';
import { v2 as cloudinary } from 'cloudinary';
import { randomUUID } from 'crypto';
import { unlink } from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import puppeteer, { Browser } from 'puppeteer';

@Injectable()
@Processor('report-card')
export class ReportCardProcessor
  extends WorkerHost
  implements OnModuleInit, OnModuleDestroy
{
  private browser: Browser | null = null;

  private launchPromise: Promise<Browser> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly notifications: NotificationService,
  ) {
    super();
  }

  private launchBrowser(): Promise<Browser> {
    return puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',

        '--disable-dev-shm-usage',
      ],
    });
  }

  async onModuleInit() {
    this.browser = await this.launchBrowser();
  }

  async onModuleDestroy() {
    await this.browser?.close().catch(() => undefined);
    this.browser = null;
  }

  private async getBrowser(): Promise<Browser> {
    if (this.browser && this.browser.connected) {
      return this.browser;
    }

    if (!this.launchPromise) {
      this.launchPromise = this.launchBrowser().finally(() => {
        this.launchPromise = null;
      });
    }

    this.browser = await this.launchPromise;
    return this.browser;
  }

  async process(
    job: Job<{
      reportCardId: string;
      studentId: string;
      academicYearId: string;
    }>,
  ) {
    const { reportCardId, studentId, academicYearId } = job.data;
    this.logger.log(`[report-card-worker] processing ${reportCardId}`);

    try {
      await this.prisma.reportCard.update({
        where: { id: reportCardId },
        data: { status: 'Processing' },
      });

      const student = await this.prisma.user.findUnique({
        where: { id: studentId },
        include: {
          details: true,
          section: { include: { class: true, combination: true } },
        },
      });

      const marks = await this.prisma.mark.findMany({
        where: {
          studentId,
          assessment: {
            category: { in: ['FinalTheory', 'FinalPractical', 'Internal'] },

            academicYearId,
          },
        },
        include: { assessment: { include: { subject: true } } },
      });

      const bySubject = new Map<
        string,
        { name: string; total: number; max: number }
      >();
      for (const m of marks) {
        const key = m.assessment.subjectId;
        const existing = bySubject.get(key) ?? {
          name: m.assessment.subject.name,
          total: 0,
          max: 0,
        };
        existing.total += m.marksObtained;
        existing.max += m.assessment.maxMarks;
        bySubject.set(key, existing);
      }

      const rows = [...bySubject.values()].map((s) => ({
        name: s.name,
        max: s.max,
        total: s.total,
        pct: s.max > 0 ? ((s.total / s.max) * 100).toFixed(1) : '-',
      }));

      const grandTotal = [...bySubject.values()].reduce(
        (sum, s) => sum + s.total,
        0,
      );
      const grandMax = [...bySubject.values()].reduce(
        (sum, s) => sum + s.max,
        0,
      );
      const overallPct =
        grandMax > 0 ? ((grandTotal / grandMax) * 100).toFixed(2) : '0';

      const studentName = escapeHtml(student?.details?.name ?? '');
      const className = escapeHtml(student?.section?.class.name ?? '');
      const combinationName = escapeHtml(
        student?.section?.combination.name ?? '',
      );

      const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body {
    font-family: Helvetica, Arial, sans-serif;
    color: #1a1a1a;
    margin: 0;
    padding: 40px;
  }
  h1 {
    font-size: 22px;
    margin: 0 0 4px 0;
  }
  .subheader {
    font-size: 15px;
    font-weight: bold;
    margin: 0 0 2px 0;
  }
  .meta {
    font-size: 12px;
    color: #444;
    margin: 0 0 20px 0;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
  }
  th, td {
    border: 1px solid #ccc;
    padding: 8px 10px;
    font-size: 12px;
    text-align: left;
  }
  th {
    background: #f2f2f2;
    text-align: left;
  }
  td.num, th.num {
    text-align: right;
  }
  .overall {
    margin-top: 20px;
    font-size: 14px;
    font-weight: bold;
  }
</style>
</head>
<body>
  <h1>Report Card</h1>
  <div class="subheader">${studentName}</div>
  <div class="meta">${className} - ${combinationName}</div>

  <table>
    <thead>
      <tr>
        <th>Subject</th>
        <th class="num">Max Marks</th>
        <th class="num">Obtained</th>
        <th class="num">Percentage</th>
      </tr>
    </thead>
    <tbody>
      ${rows
        .map(
          (r) => `
      <tr>
        <td>${escapeHtml(r.name)}</td>
        <td class="num">${r.max}</td>
        <td class="num">${r.total}</td>
        <td class="num">${r.pct}${r.pct === '-' ? '' : '%'}</td>
      </tr>`,
        )
        .join('')}
    </tbody>
  </table>

  <div class="overall">Overall: ${grandTotal}/${grandMax} (${overallPct}%)</div>
</body>
</html>`;

      const tempPdfPath = path.join(
        os.tmpdir(),
        `report-card-${reportCardId}-${randomUUID()}.pdf`,
      );

      let uploadResult: { secure_url: string };
      try {
        await this.renderPdfToFile(html, tempPdfPath);

        uploadResult = await cloudinary.uploader.upload(tempPdfPath, {
          resource_type: 'raw',
          folder: 'report-cards',
        });
      } finally {
        await unlink(tempPdfPath).catch(() => undefined);
      }

      await this.prisma.reportCard.update({
        where: { id: reportCardId },
        data: { status: 'Ready', url: uploadResult.secure_url },
      });

      await this.prisma.notification.create({
        data: {
          userId: studentId,
          type: 'MarksPublished',
          title: 'Report card ready',
          body: 'Your report card has been generated and is ready to view.',
        },
      });

      this.logger.log(`[report-card-worker] completed ${reportCardId}`);
    } catch (err) {
      this.logger.error(
        `[report-card-worker] failed ${reportCardId}`,
        String(err),
      );
      await this.prisma.reportCard.update({
        where: { id: reportCardId },
        data: { status: 'Failed', failureReason: String(err) },
      });
      throw err;
    }
  }

  private async renderPdfToFile(
    html: string,
    outputPath: string,
  ): Promise<void> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: 'domcontentloaded' });

      await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' },
      });
    } finally {
      await page.close().catch(() => undefined);
    }
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
