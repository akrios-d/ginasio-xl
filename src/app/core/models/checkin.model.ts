import { z } from 'zod';

export const CheckinSchema = z.object({
  _id: z.string().optional(),
  userId: z.string(),
  data: z.coerce.date(), // date the workout was done
  programaTreinoId: z.string().optional(),
  grupoLetra: z.string().optional(), // "A", "B", "C", …
  notas: z.string().max(500).optional(),
  createdAt: z.coerce.date().optional(),
});

export type Checkin = z.infer<typeof CheckinSchema>;
