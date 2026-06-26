import { z } from 'zod';

// ---------------------------------------------------------------------------
// Sub-schemas reutilizáveis
// ---------------------------------------------------------------------------

const ProgressaoSchema = z.object({
  data: z.coerce.date(),
  carga: z.number().optional(),
  observacao: z.string().optional(),
});

const ExercicioResistenciaSchema = z.object({
  nome: z.string().min(1),
  numeroMaquina: z.number().int().optional(),
  series: z.number().int().positive(),
  repeticoes: z.number().int().positive(),
  progressao: z.array(ProgressaoSchema).default([]),
  youtubeUrl: z.string().url().optional(),
});

const GrupoTreinoSchema = z.object({
  letra: z.string().min(1),
  exercicios: z.array(ExercicioResistenciaSchema),
  cardioAposTreino: z.boolean().default(false),
});

const ExercicioCardioSchema = z.object({
  equipamento: z.string().min(1),
  tempo: z.number().positive(),
  nivel: z.string().optional(),
  velocidade: z.string().optional(),
});

// ---------------------------------------------------------------------------
// POST /api/programa-treino  (body)
// ---------------------------------------------------------------------------

export const CreateProgramaTreinoSchema = z.object({
  alunoId: z.string().min(1),
  ptNome: z.string().optional(),
  objetivos: z.string().optional(),
  data: z.coerce.date(),
  proximaAvaliacao: z.coerce.date().optional(),
  faseInicial: z.object({
    exercicios: z.array(ExercicioCardioSchema),
  }),
  fasePrincipal: z.object({
    grupos: z.array(GrupoTreinoSchema),
    descansoEntreSeriesSegundos: z.number().int().default(60),
  }),
  faseFinal: z.object({
    duracaoSegundos: z.number().int().default(15),
    todosGruposMusculares: z.boolean().default(true),
  }),
  aulasRecomendadas: z.array(z.string()).default([]),
  observacoes: z.string().optional(),
});

// ---------------------------------------------------------------------------
// PUT /api/programa-treino/[id]  (body — todos os campos opcionais)
// ---------------------------------------------------------------------------

export const UpdateProgramaTreinoSchema = CreateProgramaTreinoSchema.partial()
  .omit({ alunoId: true })
  .extend({ ativo: z.boolean().optional() });

// ---------------------------------------------------------------------------
// GET /api/programa-treino  (query params)
// ---------------------------------------------------------------------------

export const ListProgramaTreinoSchema = z.object({
  alunoId: z.string().optional(), // PT pode filtrar por aluno específico
  asPt: z.coerce.boolean().optional(), // true → devolve programas criados pelo userId (visão PT)
  showAll: z.coerce.boolean().optional(), // true → inclui programas inactivos
});
