
import { Hono } from 'hono';
import type { TaskRequest, TaskResponse } from '@devvit/web/server';

export type ScheduleEventData = {
  title: string;
  runAt: string;
  createdAt: string;
  createdBy: string;
  conversationUser: string;
  subredditName: string;
  conversationId: string;
};

export const schedulerRoutes = new Hono();

schedulerRoutes.post('/schedule-event', async (c) => {
  const input = await c.req.json<TaskRequest<ScheduleEventData>>();
  const data = input.data;

  if (!data) {
    console.error('[scheduler] Job received no data.');
    return c.json<TaskResponse>({ status: 'ok' }, 200);
  }

  console.log('[scheduler] Scheduled event fired:', {
    ...data,
    firedAt: new Date().toISOString(),
  });

  // Future additions:
  // - Send the Discord webhook.
  // - Modify the subreddit sidebar.
  // Keep this handler safe to retry.

  return c.json<TaskResponse>({ status: 'ok' }, 200);
});
