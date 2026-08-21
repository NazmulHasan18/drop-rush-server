import { z } from 'zod';

export const reserveDropSchema = z.object({
  body: z.object({
    dropId: z.string().uuid('dropId must be a valid UUID'),
  }),
});

export type ReserveDropInput = z.infer<typeof reserveDropSchema>['body'];
