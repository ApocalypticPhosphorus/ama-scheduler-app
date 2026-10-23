import { scheduler } from '@devvit/web/server';
import type { ScheduleEventData } from '../../routes/scheduler.js';
import { saveScheduledEvent } from './events-store.js';

export async function scheduleEvent(
  data: ScheduleEventData,
  runAt: Date
): Promise<string> {
  const jobId = await scheduler.runJob({
    name: 'schedule-event',
    data,
    runAt,
  });

  await saveScheduledEvent({
    ...data,
    jobId,
  });

  return jobId;
}