import { z } from 'zod';

export const createDropSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name is required').max(150),
    price: z.number().positive('Price must be greater than 0'),
    totalStock: z.number().int().positive('Total stock must be a positive integer'),
    startsAt: z
      .string()
      .datetime({ message: 'startsAt must be a valid ISO 8601 datetime' })
      .optional(),
  }),
});

export type CreateDropInput = z.infer<typeof createDropSchema>['body'];
