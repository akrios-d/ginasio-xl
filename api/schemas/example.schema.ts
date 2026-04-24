/**
 * Zod schemas for request validation.
 *
 * Keep one schema per endpoint; export from this folder and import into the
 * matching handler. Example:
 *
 *   const { ExampleQuerySchema } = require('./schemas/example.schema');
 *   const { userId } = ExampleQuerySchema.parse(req.query);
 *
 * ZodError is caught by the handler and mapped to a 400 response.
 */
const { z } = require('zod');

const ExampleQuerySchema = z.object({
  userId: z.string().uuid(),
});

const ExampleBodySchema = z.object({
  name: z.string().min(1).max(80).trim(),
  userId: z.string().uuid(),
});

module.exports = {
  ExampleQuerySchema,
  ExampleBodySchema,
};
