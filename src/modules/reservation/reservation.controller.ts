import { catchAsync } from '../../utils/catchAsync.js';
import { sendResponse } from '../../utils/sendResponse.js';
import { AppError } from '../../utils/AppError.js';
import { config } from '../../config/index.js';
import { ReservationService } from './reservation.service.js';

const reserve = catchAsync(async (req, res) => {
  if (!req.user) throw new AppError(401, 'Unauthorized');
  const { dropId } = req.body as { dropId: string };

  const reservation = await ReservationService.reserveDrop(dropId, req.user.userId);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: `Reserved! Complete your purchase within ${config.reservation.ttlSeconds} seconds.`,
    data: reservation,
  });
});

const cancel = catchAsync(async (req, res) => {
  if (!req.user) throw new AppError(401, 'Unauthorized');
  const reservation = await ReservationService.cancelReservation(
    req.params.reservationId as string,
    req.user.userId,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Reservation cancelled and stock released',
    data: reservation,
  });
});

export const ReservationController = { reserve, cancel };
