/**
 * Zod schemas for request validation.
 *
 * Keep one schema per endpoint. Example:
 *
 *   import { ExampleQuerySchema } from '../server/schemas/example.schema.js';
 *   const { userId } = ExampleQuerySchema.parse(req.query);
 *
 * ZodError is caught by the handler and mapped to a 400 response.
 */
import { z } from 'zod';

export const ExampleQuerySchema = z.object({
  userId: z.string().uuid(),
});

export const ExampleBodySchema = z.object({
  name: z.string().min(1).max(80).trim(),
  userId: z.string().uuid(),
});
