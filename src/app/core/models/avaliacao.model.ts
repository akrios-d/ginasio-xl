import { z } from 'zod';

// ---------------------------------------------------------------------------
// Objetivos possíveis (checkboxes do cartão)
// ---------------------------------------------------------------------------

// Predefined options shown as chips in the UI (free text also allowed)
export const OBJETIVO_OPTIONS = [
  'Hipertrofia',
  'Perda Massa Gorda',
  'Reabilitação / Corretivo',
  'Performance',
  'Saúde e Bem-Estar',
] as const;

// ---------------------------------------------------------------------------
// Entrada de avaliação (uma linha da tabela)
// ---------------------------------------------------------------------------

export const PressaoArterialSchema = z.object({
  sistolica: z.number().int().positive(), // SYS  ex: 140
  diastolica: z.number().int().positive(), // DIA  ex: 105
});

export const PerimetrosSchema = z.object({
  abdominal: z.number().positive().optional(), // Abd (cm)
  cintura: z.number().positive().optional(), // Cint (cm)
});

export const EntradaAvaliacaoSchema = z.object({
  data: z.coerce.date(),
  peso: z.number().positive().optional(), // kg  ex: 106.3
  imc: z.number().positive().optional(), // ex: 32.1
  percentualMassaGorda: z.number().min(0).max(100).optional(), // %MG  ex: 33.9
  percentualMassaMagra: z.number().min(0).max(100).optional(), // %MM  ex: 30.9
  kcal: z.number().positive().optional(), // metabolismo  ex: 2088
  glicemiaVejuno: z.number().positive().optional(), // GV  ex: 14
  pressaoArterial: PressaoArterialSchema.optional(),
  fcRepouso: z.number().int().positive().optional(), // Fc.Rep bpm  ex: 73
  perimetros: PerimetrosSchema.optional(),
  observacoes: z.string().optional(),
});

export type EntradaAvaliacao = z.infer<typeof EntradaAvaliacaoSchema>;

// ---------------------------------------------------------------------------
// Metas do aluno (objetivo por métrica)
// ---------------------------------------------------------------------------

export const MetasAvaliacaoSchema = z.object({
  peso: z.number().positive().optional(),
  imc: z.number().positive().optional(),
  percentualMassaGorda: z.number().min(0).max(100).optional(),
  percentualMassaMagra: z.number().min(0).max(100).optional(),
  kcal: z.number().positive().optional(),
  glicemiaVejuno: z.number().positive().optional(),
  paSistolica: z.number().int().positive().optional(),
  paDiastolica: z.number().int().positive().optional(),
  fcRepouso: z.number().int().positive().optional(),
  perimetroAbdominal: z.number().positive().optional(),
  perimetroCintura: z.number().positive().optional(),
});

export type MetasAvaliacao = z.infer<typeof MetasAvaliacaoSchema>;

// ---------------------------------------------------------------------------
// Ficha de Avaliação (documento principal)
// ---------------------------------------------------------------------------

export const FichaAvaliacaoSchema = z.object({
  _id: z.string().optional(),
  studentId: z.string(), // userId of the student
  createdById: z.string(), // userId of creator — student or teacher
  sharedWithTeacherIds: z.array(z.string()).optional(), // teacher userIds who can see this
  objetivo: z.string().optional(),
  metas: MetasAvaliacaoSchema.optional(),
  avaliacoes: z.array(EntradaAvaliacaoSchema).default([]),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export type FichaAvaliacao = z.infer<typeof FichaAvaliacaoSchema>;
