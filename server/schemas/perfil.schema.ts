import { z } from 'zod';

export const UpsertPerfilSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  teacherIds: z.array(z.string()).optional(),
  studentAliases: z.record(z.string(), z.string()).optional(), // teacher's custom names for each student
});
