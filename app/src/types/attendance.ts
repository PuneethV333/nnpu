import { z } from "zod";

export const attendanceSummerySchema = z.object({
  data: z.object({
        from:z.coerce.date(),
        to:z.coerce.date(),
        workingDays: z.number(),
        present: z.number(),
        absent: z.number(),
        late: z.number(),
        notMarked: z.number(),
        percentage: z.number(),
    }),
    source: z.enum(["db","redis"])
})

export type attendanceSummery = z.infer<typeof attendanceSummerySchema>