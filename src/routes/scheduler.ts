import { Hono } from 'hono';
import type { TaskRequest, TaskResponse } from '@devvit/web/server';
import { settings } from '@devvit/web/server';
import { formatScheduledTime } from '../features/modmail-commands/time-zones.js';
import { refreshAmaSidebar } from '../features/modmail-commands/sidebar.js';

export type ScheduleEventData = {
  title: string;
  runAt: string;
  createdAt: string;
  createdBy: string;
  conversationUser: string;
  subredditName: string;
  conversationId: string;
  timeZone?: string;
  timeZoneLabel?: string;
  localDateTime?: string;
  isPrivate?: boolean;
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
  
  const roleSetting = await settings.get('discordRoleId');
  const configuredRoleId =
    typeof roleSetting === 'string' ? roleSetting.trim() : '';

  const roleId = /^\d{17,20}$/.test(configuredRoleId)
    ? configuredRoleId
    : '';

  if (configuredRoleId && !roleId) {
    console.warn(
      '[scheduler] Discord role ID is invalid; skipping role mention.'
    );
  }

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
            `${roleId ? `<@&${roleId}>\n` : ''}` + 
            `**Scheduled AMA: ${data.title}**\n` +
            `**Scheduled for:** <t:${Math.floor(
              new Date(data.runAt).getTime() / 1000
            )}:F>\n` +
            `**Time entered:** ${formatScheduledTime(data)}\n` +
            `**Host:** ${data.conversationUser}\n` +
            `**Subreddit:** r/${data.subredditName}\n` +
            `**Created by:** u/${data.createdBy}`,
          allowed_mentions: roleId
            ? { roles: [roleId], users: [], parse: [] }
            : { parse: [] },
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

   // Refresh the sidebar after the scheduled event has elapsed.
  try {
    await refreshAmaSidebar(data.subredditName);
    console.log(
      `[sidebar] Refreshed after event "${data.title}" elapsed.`
    );
  } catch (error) {
    console.error(
      `[sidebar] Failed to refresh after event "${data.title}" elapsed:`,
      error
    );
  }

  return c.json<TaskResponse>({ status: 'ok' }, 200);
});
