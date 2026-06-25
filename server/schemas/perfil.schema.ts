import { z } from 'zod';

export const UpsertPerfilSchema = z.object({
  numeroAluno: z.string().optional(),
  isProfessor: z.boolean().optional(),
  professorId: z.string().optional(),
});
