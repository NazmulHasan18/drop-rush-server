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

const getMine = catchAsync(async (req, res) => {
  if (!req.user) throw new AppError(401, 'Unauthorized');
  const reservations = await ReservationService.getMyReservations(req.user.userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Reservations retrieved successfully',
    data: reservations.map((reservation) => ({
      ...reservation,
      expiresAt: reservation.expiresAt.toISOString(),
      createdAt: reservation.createdAt.toISOString(),
      updatedAt: reservation.updatedAt.toISOString(),
      dropStartsAt: reservation.dropStartsAt.toISOString(),
      dropPrice: Number(reservation.dropPrice),
    })),
  });
});

export const ReservationController = { reserve, cancel, getMine };
