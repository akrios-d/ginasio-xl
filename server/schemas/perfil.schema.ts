import { z } from 'zod';

export const UpsertPerfilSchema = z.object({
  teacherIds: z.array(z.string()).optional(),
});
