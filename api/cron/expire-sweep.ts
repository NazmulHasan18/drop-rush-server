import { ReservationService } from '../../src/modules/reservation/reservation.service.js';

export default async function handler(_req: unknown, res: {
  status: (code: number) => { json: (body: unknown) => void };
}) {
  try {
    const count = await ReservationService.expireDueReservations();

    res.status(200).json({
      success: true,
      expiredCount: count,
    });
  } catch (error) {
    console.error('[cron/expire-sweep] Failed:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to expire reservations',
    });
  }
}
