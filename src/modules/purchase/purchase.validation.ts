import { z } from 'zod';

export const purchaseSchema = z.object({
  body: z.object({
    reservationId: z.string().uuid('reservationId must be a valid UUID'),
  }),
});

export type PurchaseInput = z.infer<typeof purchaseSchema>['body'];
