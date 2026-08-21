import cron from 'node-cron';
import { config } from '../config/index.js';
import { ReservationService } from '../modules/reservation/reservation.service.js';

/**
 * Stock Recovery Mechanism.
 *
 * Polls every couple of seconds (configurable via EXPIRY_SWEEP_CRON) for
 * ACTIVE reservations whose 60-second window has passed, flips them to
 * EXPIRED, returns the unit to available_stock, and broadcasts the change
 * over WebSockets. Polling (rather than one setTimeout per reservation) is
 * used deliberately: it is stateless and survives server restarts - if the
 * process crashes and comes back up, the next sweep still finds and expires
 * any reservation that timed out while it was down.
 */
export const startExpiryJob = (): void => {
  cron.schedule(config.reservation.expirySweepCron, async () => {
    try {
      const count = await ReservationService.expireDueReservations();
      if (count > 0) {
        console.log(`[expiry-sweep] Expired ${count} reservation(s) and restocked their units.`);
      }
    } catch (err) {
      console.error('[expiry-sweep] Failed:', err);
    }
  });

  console.log(`[expiry-sweep] Scheduled with cron "${config.reservation.expirySweepCron}"`);
};
