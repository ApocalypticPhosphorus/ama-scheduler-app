import { redis } from '@devvit/web/server';
import type { ScheduleEventData } from '../../routes/scheduler.js';

const EVENTS_KEY = 'scheduled-events';

export type ScheduledEventRecord = ScheduleEventData & {
  jobId: string;
};

export async function saveScheduledEvent(
  event: ScheduledEventRecord
): Promise<void> {
  await redis.hSet(EVENTS_KEY, {
    [event.jobId]: JSON.stringify(event),
  });
}

export async function getScheduledEvents(): Promise<ScheduledEventRecord[]> {
  const jobIds = await redis.hKeys(EVENTS_KEY);
  const events: ScheduledEventRecord[] = [];

  for (const jobId of jobIds) {
    const raw = await redis.hGet(EVENTS_KEY, jobId);

    if (!raw) {
      continue;
    }

    try {
      events.push(JSON.parse(raw) as ScheduledEventRecord);
    } catch {
      console.error('[events-store] Invalid event record:', jobId);
    }
  }

  return events.sort(
    (a, b) => new Date(a.runAt).getTime() - new Date(b.runAt).getTime()
  );
}

export async function removeScheduledEvent(jobId: string): Promise<void> {
  await redis.hDel(EVENTS_KEY, [jobId]);
}