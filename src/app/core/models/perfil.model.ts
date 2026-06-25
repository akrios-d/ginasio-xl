import { z } from 'zod';

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export const RoleSchema = z.enum(['aluno', 'professor', 'admin']);
export type Role = z.infer<typeof RoleSchema>;

// ---------------------------------------------------------------------------
// Perfil (extensão do utilizador autenticado)
// Ligado ao user do @auth/core pelo mesmo id/email
// ---------------------------------------------------------------------------

export const PerfilSchema = z.object({
  _id: z.string().optional(),
  userId: z.string(), // id do user no @auth/core
  email: z.string().optional(),
  nome: z.string().optional(),
  role: RoleSchema.default('aluno'),
  numeroAluno: z.string().optional(), // atribuído pela academia
  isProfessor: z.boolean().optional(), // activo como Personal Trainer
  professorId: z.string().optional(), // userId do PT associado
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export type Perfil = z.infer<typeof PerfilSchema>;
