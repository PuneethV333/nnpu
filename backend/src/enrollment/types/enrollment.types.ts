import {
  EnrollmentDriveStatus,
  EnrollmentSubmissionStatus,
  SecondLanguage,
  Stream,
} from '@/generated/prisma';
import { z } from 'zod';

export const QuestionMapSchema = z.object({
  name: z.string(),
  email: z.string(),
  session: z.string(),
  combination: z.string(),
  language: z.string(),
});

export type QuestionMap = z.infer<typeof QuestionMapSchema>;

export const ParsedResponseSchema = z.object({
  name: z.string(),
  email: z.string(),
  session: z.string(),
  combinationId: z.string().nullable(),
  language: z.enum(['Kannada', 'Hindi', 'Sanskrit']),
  submittedAt: z.date(),
});

export type ParsedResponse = z.infer<typeof ParsedResponseSchema>;

export const submissionSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  stream: z.enum(Stream),
  session: z.string(),
  language: z.enum(SecondLanguage).nullable(),
  submittedAt: z.date(),
  status: z.enum(EnrollmentSubmissionStatus),
});

export const getDriveReturnSchema = z.object({
  id: z.string(),
  academicYearId: z.string(),
  stream: z.enum(Stream),
  status: z.enum(EnrollmentDriveStatus),
  opensAt: z.date(),
  closesAt: z.date(),
  submissions: z.array(submissionSchema),
});

export type getDriveReturnType = z.infer<typeof getDriveReturnSchema>;
