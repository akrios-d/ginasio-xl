import { z } from 'zod';

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export const RoleSchema = z.enum(['student', 'teacher', 'admin']);
export type Role = z.infer<typeof RoleSchema>;

// ---------------------------------------------------------------------------
// Teacher-specific profile fields
// ---------------------------------------------------------------------------

export const TeacherProfileSchema = z.object({
  specialty: z.string().optional(), // e.g. Strength & Conditioning
  bio: z.string().optional(), // short description shown to students
  certifications: z.array(z.string()).optional(), // e.g. NASM-CPT, ACE
});

export type TeacherProfile = z.infer<typeof TeacherProfileSchema>;

// ---------------------------------------------------------------------------
// Profile (extension of the authenticated user)
// Linked to the @auth/core user by the same id/email
// ---------------------------------------------------------------------------

export const PerfilSchema = z.object({
  _id: z.string().optional(),
  userId: z.string(), // id from @auth/core
  email: z.string().optional(),
  name: z.string().optional(),
  roles: z.array(RoleSchema).default(['student']), // multi-role: student | teacher | admin
  studentNumber: z.string().optional(), // assigned by the gym
  teacherIds: z.array(z.string()).optional(), // userIds of associated teachers/PTs
  teacherProfile: TeacherProfileSchema.optional(), // only relevant when roles includes 'teacher'
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export type Perfil = z.infer<typeof PerfilSchema>;
