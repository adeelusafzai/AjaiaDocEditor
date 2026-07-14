import { z } from 'zod';
import { badRequest } from './errors.js';

/** Runs a zod schema and throws a 400 HttpError with field details on failure. */
export function validate(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      field: i.path.join('.') || '(root)',
      message: i.message,
    }));
    throw badRequest('Validation failed', details);
  }
  return result.data;
}

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('A valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const createDocumentSchema = z.object({
  title: z.string().trim().max(200, 'Title must be 200 characters or fewer').optional(),
  content: z.string().optional(),
});

export const updateDocumentSchema = z
  .object({
    title: z.string().trim().min(1, 'Title cannot be empty').max(200).optional(),
    content: z.string().optional(),
  })
  .refine((v) => v.title !== undefined || v.content !== undefined, {
    message: 'Provide at least one of: title, content',
  });

export const shareSchema = z.object({
  email: z.string().trim().toLowerCase().email('A valid email is required'),
  role: z.enum(['viewer', 'editor']).default('editor'),
});
