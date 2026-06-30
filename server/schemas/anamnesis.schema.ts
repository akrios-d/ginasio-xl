import { z } from 'zod';

export const UpsertAnamnesisSchema = z.object({
  birthDate: z.string().optional(),
  exerciseRoutine: z.string().max(2000).optional(),
  medicalConditions: z.string().max(2000).optional(),
  painComplaints: z.string().max(2000).optional(),
  trainingProgress: z.string().max(2000).optional(),
  dizzinessFainting: z.string().max(2000).optional(),
  primaryGoal: z.enum(['aesthetic', 'health', 'both']).optional(),
  medicationsSupplements: z.string().max(2000).optional(),
  medicalExams: z.string().max(2000).optional(),
  diet: z.string().max(2000).optional(),
  sleepQuality: z.string().max(2000).optional(),
  waterIntake: z.string().max(2000).optional(),
  alcoholSmoking: z.string().max(2000).optional(),
});
