import { z } from 'zod';

export const CreateCheckinSchema = z.object({
  data: z.coerce.date(),
  programaTreinoId: z.string().optional(),
  grupoLetra: z.string().optional(),
  notas: z.string().max(500).optional(),
});

export const ListCheckinSchema = z.object({
  from: z.string().optional(), // ISO date string
  to: z.string().optional(),
});
