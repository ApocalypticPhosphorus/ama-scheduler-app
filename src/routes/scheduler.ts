import { Hono } from 'hono';
import type { TaskRequest, TaskResponse } from '@devvit/web/server';
import { settings } from '@devvit/web/server';

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

  const webhookSetting = await settings.get('discordWebhookUrl');
  const webhookUrl =
    typeof webhookSetting === 'string' ? webhookSetting.trim() : '';

  console.log('[scheduler] Discord webhook configured:', Boolean(webhookUrl));

  console.log('[scheduler] Scheduled event fired:', {
    ...data,
    firedAt: new Date().toISOString(),
  });

  if (!webhookUrl) {
    console.warn(
      '[scheduler] Discord webhook is not configured; skipping notification.'
    );
  } else {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content:
            `**Scheduled Event: ${data.title}**\n` +
            `**Scheduled for:** <t:${Math.floor(
              new Date(data.runAt).getTime() / 1000
            )}:F>\n` +
            `**Subreddit:** r/${data.subredditName}\n` +
            `**Created by:** u/${data.createdBy}\n` +
            `**Conversation user:** ${data.conversationUser}`,
          allowed_mentions: {
            parse: [],
          },
        }),
      });

      if (!response.ok) {
        console.error(
          `[scheduler] Discord webhook failed with HTTP ${response.status}.`
        );
      } else {
        console.log('[scheduler] Discord notification sent successfully.');
      }
    } catch {
      console.error('[scheduler] Failed to send Discord notification.');
    }
  }

  // Future additions:
  // - Send the Discord webhook.
  // - Modify the subreddit sidebar.
  // Keep this handler safe to retry.

  return c.json<TaskResponse>({ status: 'ok' }, 200);
});
