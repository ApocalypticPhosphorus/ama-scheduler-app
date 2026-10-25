
import { Temporal } from '@js-temporal/polyfill';

const TIME_ZONE_ALIASES: Record<string, string> = {
  ET: 'America/New_York',
  CT: 'America/Chicago',
  MT: 'America/Denver',
  PT: 'America/Los_Angeles',
  UTC: 'Etc/UTC',
  GMT: 'Etc/UTC',
};

export type ZonedScheduleTime = {
  runAt: Date;
  timeZone: string;
  timeZoneLabel: string;
  localDateTime: string;
};

export function parseZonedScheduleTime(
  date: string,
  time: string,
  timeZoneInput: string
): ZonedScheduleTime {
  const input = timeZoneInput.trim();
  const alias = TIME_ZONE_ALIASES[input.toUpperCase()];

  const timeZone = alias ?? input;

  // Validate that the timezone is recognized.
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format();
  } catch {
    throw new Error(
      `Unknown timezone "${input}". Use ET, CT, MT, PT, UTC, or an IANA timezone such as America/New_York.`
    );
  }

  // Strictly validate the calendar date and clock time.
  let localDateTime: Temporal.PlainDateTime;

  try {
    localDateTime = Temporal.PlainDateTime.from(
      `${date}T${time}:00`,
      { overflow: 'reject' }
    );
  } catch {
    throw new Error(
      'Invalid date or time. Use the format YYYY-MM-DD HH:mm.'
    );
  }

  // Reject times that are ambiguous or nonexistent due to daylight saving.
  let zonedDateTime: Temporal.ZonedDateTime;

  try {
    zonedDateTime = localDateTime.toZonedDateTime(timeZone, {
      disambiguation: 'reject',
    });
  } catch {
    throw new Error(
      `The local time ${date} ${time} is ambiguous or does not exist in ${input} because of a daylight-saving transition. Choose another time.`
    );
  }

  const runAt = new Date(zonedDateTime.toInstant().epochMilliseconds);

  if (runAt.getTime() <= Date.now()) {
    throw new Error('That date and time has already passed.');
  }

  return {
    runAt,
    timeZone,
    timeZoneLabel: alias ? input.toUpperCase() : input,
    localDateTime: `${date}T${time}:00`,
  };
}


type EventTimeFields = {
  runAt: string;
  timeZone?: string;
  timeZoneLabel?: string;
  localDateTime?: string;
};

export function formatScheduledTime(
  event: EventTimeFields
): string {
  const timeZone = event.timeZone ?? 'Etc/UTC';
  const instant = new Date(event.runAt);

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(instant);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  const date = `${get('weekday')} ${get('month')}/${get('day')}`;
  const time = `${get('hour')}:${get('minute')} ${get('dayPeriod')}`;
  const zone = event.timeZoneLabel ?? timeZone;

  return `${date} at ${time} ${zone}`;
}

