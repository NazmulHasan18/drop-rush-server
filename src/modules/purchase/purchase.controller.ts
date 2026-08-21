import { catchAsync } from '../../utils/catchAsync.js';
import { sendResponse } from '../../utils/sendResponse.js';
import { AppError } from '../../utils/AppError.js';
import { PurchaseService } from './purchase.service.js';

const purchase = catchAsync(async (req, res) => {
  if (!req.user) throw new AppError(401, 'Unauthorized');
  const { reservationId } = req.body as { reservationId: string };

  const result = await PurchaseService.purchaseReservation(reservationId, req.user.userId);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Purchase completed successfully',
    data: result,
  });
});

export const PurchaseController = { purchase };
