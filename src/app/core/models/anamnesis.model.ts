import { z } from 'zod';

export const AnamnesisGoalSchema = z.enum(['aesthetic', 'health', 'both']);
export type AnamnesisGoal = z.infer<typeof AnamnesisGoalSchema>;

export const AnamnesisSchema = z.object({
  _id: z.string().optional(),
  userId: z.string(),

  birthDate: z.string().optional(), // ISO date string e.g. "1990-05-14"

  // 12 questions
  exerciseRoutine: z.string().optional(), // Q1
  medicalConditions: z.string().optional(), // Q2
  painComplaints: z.string().optional(), // Q3
  trainingProgress: z.string().optional(), // Q4
  dizzinessFainting: z.string().optional(), // Q5
  primaryGoal: AnamnesisGoalSchema.optional(), // Q6 (select)
  medicationsSupplements: z.string().optional(), // Q7
  medicalExams: z.string().optional(), // Q8
  diet: z.string().optional(), // Q9
  sleepQuality: z.string().optional(), // Q10
  waterIntake: z.string().optional(), // Q11
  alcoholSmoking: z.string().optional(), // Q12

  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export type Anamnesis = z.infer<typeof AnamnesisSchema>;
