import { z } from 'zod';

// ---------------------------------------------------------------------------
// POST /api/avaliacao  (body)
// ---------------------------------------------------------------------------

const MedicaoShape = z.object({
  data: z.coerce.date(),
  peso: z.number().positive().optional(),
  imc: z.number().positive().optional(),
  percentualMassaGorda: z.number().min(0).max(100).optional(),
  percentualMassaMagra: z.number().min(0).max(100).optional(),
  kcal: z.number().positive().optional(),
  glicemiaVejuno: z.number().positive().optional(),
  pressaoArterial: z
    .object({
      sistolica: z.number().int().positive(),
      diastolica: z.number().int().positive(),
    })
    .optional(),
  fcRepouso: z.number().int().positive().optional(),
  perimetros: z
    .object({
      abdominal: z.number().positive().optional(),
      cintura: z.number().positive().optional(),
    })
    .optional(),
  observacoes: z.string().optional(),
});

export const CreateAvaliacaoSchema = z.object({
  studentId: z.string().min(1),
  objetivo: z.string().optional(),
  metas: z
    .object({
      pesoMin: z.number().positive().optional(),
      pesoMax: z.number().positive().optional(),
      percentualMassaGordaMin: z.number().min(0).max(100).optional(),
      percentualMassaGordaMax: z.number().min(0).max(100).optional(),
      glicemiaVejunoMax: z.number().positive().optional(),
    })
    .optional(),
  // avaliacoes can be seeded on create, but NEVER updated via PUT
  avaliacoes: z.array(MedicaoShape).default([]),
});

// ---------------------------------------------------------------------------
// PUT /api/avaliacao/[id]
// ---------------------------------------------------------------------------

export const UpdateAvaliacaoSchema = CreateAvaliacaoSchema.omit({
  studentId: true,
  avaliacoes: true, // managed via POST /entrada -- never overwrite via PUT
})
  .extend({
    sharedWithTeacherIds: z.array(z.string()).optional(),
  })
  .partial();

// ---------------------------------------------------------------------------
// POST /api/avaliacao/[id]/entrada  -- adicionar uma nova medicao
// ---------------------------------------------------------------------------

export const AddEntradaAvaliacaoSchema = MedicaoShape;
