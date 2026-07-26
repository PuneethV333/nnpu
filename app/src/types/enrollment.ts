import { z } from 'zod';

export const streamEnum = z.enum(['Science', 'Commerce']);
export type Stream = z.infer<typeof streamEnum>;

export const secondLanguageEnum = z.enum(['Kannada', 'Hindi', 'Sanskrit']);
export type SecondLanguage = z.infer<typeof secondLanguageEnum>;

export const enrollmentDriveStatusEnum = z.enum(['Open', 'Closed', 'Processed']);
export type EnrollmentDriveStatus = z.infer<typeof enrollmentDriveStatusEnum>;

export const enrollmentSubmissionStatusEnum = z.enum(['Pending', 'Promoted', 'Rejected']);
export type EnrollmentSubmissionStatus = z.infer<typeof enrollmentSubmissionStatusEnum>;

export const sessionEntrySchema = z.object({
  stream: streamEnum,
  name: z.string(),
});

export const createDriveSchema = z.object({
  academicYearId: z.string(),
  closesAt: z.string(),
  sessions: z.array(sessionEntrySchema).min(1),
});

export type CreateDrive = z.infer<typeof createDriveSchema>;

export const sectionResultSchema = z.object({
  session: z.string(),
  created: z.boolean(),
});

export const driveResultSchema = z.object({
  drive: z.object({
    id: z.string(),
    academicYearId: z.string(),
    stream: streamEnum,
    formId: z.string(),
    questionMap: z.any(),
    opensAt: z.coerce.date(),
    closesAt: z.coerce.date(),
    status: enrollmentDriveStatusEnum,
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
  }),
  sectionsCreated: z.array(sectionResultSchema),
  responderUri: z.string().nullable(),
});

export const createDriveResponseSchema = z.object({
  science: driveResultSchema.optional(),
  commerce: driveResultSchema.optional(),
});

export type CreateDriveResponse = z.infer<typeof createDriveResponseSchema>;

export const enrollmentDriveSchema = z.object({
  id: z.string(),
  academicYearId: z.string(),
  stream: streamEnum,
  formId: z.string(),
  questionMap: z.any(),
  opensAt: z.coerce.date(),
  closesAt: z.coerce.date(),
  status: enrollmentDriveStatusEnum,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const enrollmentDriveArraySchema = z.array(enrollmentDriveSchema);

export type EnrollmentDrive = z.infer<typeof enrollmentDriveSchema>;

export const enrollmentSubmissionSchema = z.object({
  id: z.string(),
  driveId: z.string(),
  name: z.string(),
  email: z.string(),
  stream: streamEnum,
  session: z.string(),
  combinationId: z.string().nullable(),
  language: secondLanguageEnum.nullable(),
  submittedAt: z.coerce.date(),
  status: enrollmentSubmissionStatusEnum,
  promotedUserId: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const enrollmentSubmissionArraySchema = z.array(enrollmentSubmissionSchema);

export type EnrollmentSubmission = z.infer<typeof enrollmentSubmissionSchema>;

export const driveDetailSubmissionSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  stream: streamEnum,
  session: z.string(),
  language: secondLanguageEnum.nullable(),
  submittedAt: z.coerce.date(),
  status: enrollmentSubmissionStatusEnum,
});

export const getDriveResponseSchema = z.object({
  id: z.string(),
  academicYearId: z.string(),
  stream: streamEnum,
  status: enrollmentDriveStatusEnum,
  opensAt: z.coerce.date(),
  closesAt: z.coerce.date(),
  submissions: z.array(driveDetailSubmissionSchema),
});

export type GetDriveResponse = z.infer<typeof getDriveResponseSchema>;

export const promoteAllResponseSchema = z.object({
  promoted: z.number(),
  failed: z.number(),
  errors: z.array(
    z.object({
      submissionId: z.string(),
      error: z.string(),
    }),
  ),
});

export type PromoteAllResponse = z.infer<typeof promoteAllResponseSchema>;
