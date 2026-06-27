import { z } from 'zod';

export const CheckinCargaSchema = z.object({
  nome: z.string(),
  carga: z.number().positive(),
});

export const CheckinSchema = z.object({
  _id: z.string().optional(),
  userId: z.string(),
  data: z.coerce.date(), // date the workout was done
  programaTreinoId: z.string().optional(),
  grupoLetra: z.string().optional(), // "A", "B", "C", …
  notas: z.string().max(500).optional(),
  cargas: z.array(CheckinCargaSchema).optional(), // actual loads done that day
  createdAt: z.coerce.date().optional(),
});

export type Checkin = z.infer<typeof CheckinSchema>;
