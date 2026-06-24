import { z } from 'zod';

// ---------------------------------------------------------------------------
// Aluno
// ---------------------------------------------------------------------------

export const AlunoSchema = z.object({
  _id: z.string().optional(),
  nome: z.string().min(1),
  numeroAluno: z.string().optional(),
  email: z.string().email().optional(),
  createdAt: z.coerce.date().optional(),
});

export type Aluno = z.infer<typeof AlunoSchema>;

// ---------------------------------------------------------------------------
// Personal Trainer
// ---------------------------------------------------------------------------

export const PersonalTrainerSchema = z.object({
  _id: z.string().optional(),
  nome: z.string().min(1),
  email: z.string().email().optional(),
});

export type PersonalTrainer = z.infer<typeof PersonalTrainerSchema>;

// ---------------------------------------------------------------------------
// Fase Inicial – Treino Cardiovascular
// ---------------------------------------------------------------------------

export const ExercicioCardioSchema = z.object({
  equipamento: z.string().min(1), // ex: "Elíptica", "Passadeira"
  tempo: z.number().positive(), // minutos
  nivel: z.string().optional(), // ex: "3-4", "6-8%"
  velocidade: z.string().optional(), // ex: "90-120", "5.5-6"
});

export type ExercicioCardio = z.infer<typeof ExercicioCardioSchema>;

export const FaseCardiovascularSchema = z.object({
  exercicios: z.array(ExercicioCardioSchema),
});

export type FaseCardiovascular = z.infer<typeof FaseCardiovascularSchema>;

// ---------------------------------------------------------------------------
// Fase Principal – Treino com Resistência
// ---------------------------------------------------------------------------

export const ProgressaoSchema = z.object({
  data: z.coerce.date(),
  carga: z.number().optional(), // kg
  observacao: z.string().optional(),
});

export type Progressao = z.infer<typeof ProgressaoSchema>;

export const ExercicioResistenciaSchema = z.object({
  nome: z.string().min(1), // ex: "Shoulder Press"
  numeroMaquina: z.number().int().optional(), // nr. máquina/estação
  series: z.number().int().positive(), // ex: 3
  repeticoes: z.number().int().positive(), // ex: 10
  progressao: z.array(ProgressaoSchema).default([]),
});

export type ExercicioResistencia = z.infer<typeof ExercicioResistenciaSchema>;

export const GrupoTreinoSchema = z.object({
  letra: z.string().min(1), // ex: "A", "B", "C" ... sem limite
  exercicios: z.array(ExercicioResistenciaSchema),
  cardioAposTreino: z.boolean().default(false),
});

export type GrupoTreino = z.infer<typeof GrupoTreinoSchema>;

export const FaseResistenciaSchema = z.object({
  grupos: z.array(GrupoTreinoSchema),
  descansoEntreSeriesSegundos: z.number().int().default(60),
});

export type FaseResistencia = z.infer<typeof FaseResistenciaSchema>;

// ---------------------------------------------------------------------------
// Fase Final – Alongamentos Estáticos
// ---------------------------------------------------------------------------

export const FaseAlongamentosSchema = z.object({
  duracaoSegundos: z.number().int().default(15),
  todosGruposMusculares: z.boolean().default(true),
});

export type FaseAlongamentos = z.infer<typeof FaseAlongamentosSchema>;

// ---------------------------------------------------------------------------
// Programa de Treino (documento principal)
// ---------------------------------------------------------------------------

export const ProgramaTreinoSchema = z.object({
  _id: z.string().optional(),
  alunoId: z.string(), // userId do aluno (session.user.id)
  criadoPorId: z.string(), // userId de quem criou — pode ser o próprio aluno ou um professor
  ptNome: z.string().optional(), // nome do PT conforme impresso no cartão
  objetivos: z.string().optional(), // ex: "Perda M. Gorda"
  data: z.coerce.date(),
  proximaAvaliacao: z.coerce.date().optional(),
  faseInicial: FaseCardiovascularSchema,
  fasePrincipal: FaseResistenciaSchema,
  faseFinal: FaseAlongamentosSchema,
  aulasRecomendadas: z.array(z.string()).default([]),
  observacoes: z.string().optional(),
  ativo: z.boolean().default(true),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export type ProgramaTreino = z.infer<typeof ProgramaTreinoSchema>;
