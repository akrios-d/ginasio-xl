import { z } from 'zod';

const RoleSchema = z.enum(['student', 'teacher', 'admin']);

const TeacherProfileSchema = z.object({
  specialty: z.string().optional(),
  bio: z.string().optional(),
  certifications: z.array(z.string()).optional(),
});

export const UpsertPerfilSchema = z.object({
  studentNumber: z.string().optional(),
  roles: z.array(RoleSchema).optional(),
  teacherIds: z.array(z.string()).optional(),
  teacherProfile: TeacherProfileSchema.optional(),
});
