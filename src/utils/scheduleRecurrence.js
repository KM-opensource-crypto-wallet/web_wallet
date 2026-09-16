// Verbatim copy of mobile_app/src/utils/scheduleRecurrence.js - keep the two
// identical. Pure dayjs logic with no platform difference, so its proper home
// is the shared submodule (helper/scheduleRecurrence.js); it lives here only
// because dok-wallet-blockchain-networks imports the bare `utils/scheduleRecurrence`.

import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

export const SCHEDULED_DATE_FORMAT = 'YYYY-MM-DD HH:mm';

export const REPEAT_TYPE = {
  NONE: 'none',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
  CUSTOM: 'custom',
};

export const CUSTOM_UNIT = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
};

export const WEEKDAYS = [
  {value: 0, short: 'S', label: 'Sunday'},
  {value: 1, short: 'M', label: 'Monday'},
  {value: 2, short: 'T', label: 'Tuesday'},
  {value: 3, short: 'W', label: 'Wednesday'},
  {value: 4, short: 'T', label: 'Thursday'},
  {value: 5, short: 'F', label: 'Friday'},
  {value: 6, short: 'S', label: 'Saturday'},
];

// Length of a repeating series (product decision): a repeating payment ends
// after this many occurrences. The OS caps on pending notifications (iOS 64,
// Android 50) are enforced separately by utils/scheduledPaymentTriggerPlan.
export const MAX_OCCURRENCES = 30;

const REPEAT_UNIT_BY_TYPE = {
  [REPEAT_TYPE.DAILY]: 'day',
  [REPEAT_TYPE.WEEKLY]: 'week',
  [REPEAT_TYPE.MONTHLY]: 'month',
  [REPEAT_TYPE.YEARLY]: 'year',
};

const getRepeatUnit = recurrence => {
  if (recurrence?.type === REPEAT_TYPE.CUSTOM) {
    return recurrence?.unit || CUSTOM_UNIT.DAY;
  }
  return REPEAT_UNIT_BY_TYPE[recurrence?.type];
};

// Returns every occurrence timestamp (ms) for a recurrence rule, starting
// at scheduledAt and running up to MAX_OCCURRENCES. There's no user-facing
// end condition — the user stops a series early by deleting it.
export const computeOccurrences = ({scheduledAt, recurrence}) => {
  const start = Number(scheduledAt);
  if (!start || !Number.isFinite(start)) {
    return [];
  }
  if (!recurrence || recurrence.type === REPEAT_TYPE.NONE) {
    return [start];
  }

  const interval = Math.max(1, parseInt(recurrence.interval, 10) || 1);
  const unit = getRepeatUnit(recurrence);

  const weeklyDays =
    recurrence.type === REPEAT_TYPE.WEEKLY &&
    Array.isArray(recurrence.weeklyDays) &&
    recurrence.weeklyDays.length
      ? [...new Set(recurrence.weeklyDays)].sort((a, b) => a - b)
      : null;

  const occurrences = [];

  if (weeklyDays) {
    const anchorWeekStart = dayjs(start).startOf('week');
    const startTime = dayjs(start);
    let cursor = startTime.startOf('day');
    // Secondary bound so the day-by-day walk can't spin forever.
    const walkLimit = cursor.add(2, 'year');
    while (occurrences.length < MAX_OCCURRENCES && cursor.isBefore(walkLimit)) {
      const weeksSinceAnchor = cursor
        .startOf('week')
        .diff(anchorWeekStart, 'week');
      if (
        weeksSinceAnchor >= 0 &&
        weeksSinceAnchor % interval === 0 &&
        weeklyDays.includes(cursor.day())
      ) {
        const candidate = cursor.isSame(startTime, 'day')
          ? start
          : cursor
              .hour(startTime.hour())
              .minute(startTime.minute())
              .second(0)
              .millisecond(0)
              .valueOf();
        if (candidate >= start) {
          occurrences.push(candidate);
        }
      }
      cursor = cursor.add(1, 'day');
    }
    return occurrences;
  }

  // Each occurrence is computed from the original `start`, not by chaining
  // off the previous one - dayjs clamps end-of-month overflow (Jan 31 + 1
  // month -> Feb 28), and chaining off that clamped result would permanently
  // drift the series off the original day-of-month (Feb 28 + 1 month -> Mar
  // 28, forever).
  let index = 0;
  while (occurrences.length < MAX_OCCURRENCES) {
    occurrences.push(
      dayjs(start)
        .add(interval * index, unit)
        .valueOf(),
    );
    index += 1;
  }
  return occurrences;
};

export const buildRecurrence = values => {
  if (values.repeatType === REPEAT_TYPE.NONE) {
    return {type: REPEAT_TYPE.NONE};
  }
  const recurrence = {
    type: values.repeatType,
    interval:
      values.repeatType === REPEAT_TYPE.CUSTOM
        ? Math.max(1, parseInt(values.repeatInterval, 10) || 1)
        : 1,
  };
  if (values.repeatType === REPEAT_TYPE.CUSTOM) {
    recurrence.unit = values.repeatUnit;
  }
  if (values.repeatType === REPEAT_TYPE.WEEKLY) {
    recurrence.weeklyDays = values.weeklyDays.length
      ? values.weeklyDays
      : [dayjs(values.scheduledDate, SCHEDULED_DATE_FORMAT, true).day()];
  }
  return recurrence;
};

export const describeRecurrence = recurrence => {
  if (!recurrence || recurrence.type === REPEAT_TYPE.NONE) {
    return null;
  }
  const interval = Math.max(1, parseInt(recurrence.interval, 10) || 1);
  let base;
  switch (recurrence.type) {
    case REPEAT_TYPE.DAILY:
      base =
        interval === 1 ? 'Repeats daily' : `Repeats every ${interval} days`;
      break;
    case REPEAT_TYPE.WEEKLY: {
      const days =
        Array.isArray(recurrence.weeklyDays) && recurrence.weeklyDays.length
          ? recurrence.weeklyDays
              .slice()
              .sort((a, b) => a - b)
              .map(d => WEEKDAYS[d]?.label?.slice(0, 3))
              .join(', ')
          : null;
      const weeklyBase =
        interval === 1 ? 'Repeats weekly' : `Repeats every ${interval} weeks`;
      base = days ? `${weeklyBase} on ${days}` : weeklyBase;
      break;
    }
    case REPEAT_TYPE.MONTHLY:
      base =
        interval === 1 ? 'Repeats monthly' : `Repeats every ${interval} months`;
      break;
    case REPEAT_TYPE.YEARLY:
      base =
        interval === 1 ? 'Repeats yearly' : `Repeats every ${interval} years`;
      break;
    case REPEAT_TYPE.CUSTOM: {
      const unit = recurrence.unit || CUSTOM_UNIT.DAY;
      base = `Repeats every ${interval} ${unit}${interval === 1 ? '' : 's'}`;
      break;
    }
    default:
      base = 'Repeats';
  }
  return base;
};

// The next occurrence of a payment at or after `now`, as
// {timestamp, index, total} — index/total let the UI say "3 of 24". A
// payment stores only its original start; the series is recomputed from
// `recurrence` (same as the reminder scheduler) so a repeating payment
// whose first occurrences have fired still resolves to its next one.
// Returns null when nothing is left: a one-time payment whose time has
// passed, or a repeating series that has run through MAX_OCCURRENCES.
export const getNextOccurrence = (payment, now = Date.now()) => {
  if (!payment) {
    return null;
  }
  const occurrences = computeOccurrences({
    scheduledAt: payment.scheduledAt,
    recurrence: payment.recurrence,
  });
  const index = occurrences.findIndex(timestamp => timestamp >= now);
  if (index === -1) {
    return null;
  }
  return {timestamp: occurrences[index], index, total: occurrences.length};
};

// A scheduled payment with no upcoming occurrence has no live reminder and
// nothing left to show — callers prune it from redux.
export const isScheduledPaymentExpired = (payment, now = Date.now()) =>
  getNextOccurrence(payment, now) === null;
