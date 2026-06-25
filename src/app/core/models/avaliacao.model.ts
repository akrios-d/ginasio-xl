import { z } from 'zod';

// ---------------------------------------------------------------------------
// Objetivos possíveis (checkboxes do cartão)
// ---------------------------------------------------------------------------

export const ObjetivoTreinoSchema = z.enum([
  'Hipertrofia',
  'Perda Massa Gorda',
  'Reabilitação / Corretivo',
  'Performance',
  'Saúde e Bem-Estar',
]);

export type ObjetivoTreino = z.infer<typeof ObjetivoTreinoSchema>;

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
// Metas do aluno (linha amarela)
// ---------------------------------------------------------------------------

export const MetasAvaliacaoSchema = z.object({
  pesoMin: z.number().positive().optional(), // ex: 77
  pesoMax: z.number().positive().optional(), // ex: 82
  percentualMassaGordaMin: z.number().min(0).max(100).optional(), // ex: 18
  percentualMassaGordaMax: z.number().min(0).max(100).optional(), // ex: 20
  glicemiaVejunoMax: z.number().positive().optional(), // ex: 10
});

export type MetasAvaliacao = z.infer<typeof MetasAvaliacaoSchema>;

// ---------------------------------------------------------------------------
// Ficha de Avaliação (documento principal)
// ---------------------------------------------------------------------------

export const FichaAvaliacaoSchema = z.object({
  _id: z.string().optional(),
  alunoId: z.string(), // userId do aluno (session.user.id)
  criadoPorId: z.string(), // userId de quem criou — pode ser o próprio aluno ou um professor
  objetivo: ObjetivoTreinoSchema.optional(),
  outrosObjetivos: z.string().optional(), // ex: "Reduzir peso."
  metas: MetasAvaliacaoSchema.optional(),
  avaliacoes: z.array(EntradaAvaliacaoSchema).default([]),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export type FichaAvaliacao = z.infer<typeof FichaAvaliacaoSchema>;
