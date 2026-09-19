// Platform seam for dok-wallet-blockchain-networks/redux/schedulePayment.
//
// Mobile schedules local reminder notifications with notifee
// (mobile_app/src/utils/scheduledPaymentNotifications.js). Web has no
// scheduled-payment feature and no way to hold a pending local notification,
// so every function here is a no-op that keeps the shared slice's contract:
// same export names, same resolved shapes. `requestLocalNotificationPermission`
// reports not-granted so `submitScheduledPayment` refuses to persist a payment
// that could never fire, and `reconcileScheduledPaymentNotifications` (called
// from authSlice on login lockout) resolves without touching anything.

export const SCHEDULED_PAYMENT_NOTIFICATION_TYPE = 'scheduledPayment';

// Web can hold no pending trigger notifications.
export const MAX_PENDING_TRIGGER_NOTIFICATIONS = 0;

export const requestLocalNotificationPermission = async () => ({
  granted: false,
  blocked: false,
});

export const collectPaymentsForReminders = () => [];

export const getReminderSlotUsage = () => ({
  used: 0,
  limit: MAX_PENDING_TRIGGER_NOTIFICATIONS,
});

export const reconcileScheduledPaymentNotifications = async () => ({
  armedForInclude: 0,
  cancelled: 0,
});

export const createScheduledPaymentNotification = async () => ({
  scheduled: false,
  blocked: false,
});

// Web has no notification tray, so no payment can have a displayed reminder.
// Returns a Set like mobile so schedulePaymentSlice's prune can spread it into
// its keep-set unchanged. (Mobile's version reads notifee's displayed
// notifications and can throw on a read failure; here there is nothing to
// read, so an empty Set is the honest answer, not a swallowed error.)
export const getPaymentIdsWithDisplayedReminders = async () => new Set();

export const cancelDisplayedRemindersForPayment = async () => {};
