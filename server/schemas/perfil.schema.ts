import { z } from 'zod';

export const UpsertPerfilSchema = z.object({
  nome: z.string().min(1),
  numeroAluno: z.string().optional(),
});
