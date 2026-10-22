import { scheduler } from '@devvit/web/server';
import type { ScheduleEventData } from '../../routes/scheduler.js';

export async function scheduleEvent(
  data: ScheduleEventData,
  runAt: Date
): Promise<string> {
  return scheduler.runJob({
    name: 'schedule-event',
    data,
    runAt,
  });
}