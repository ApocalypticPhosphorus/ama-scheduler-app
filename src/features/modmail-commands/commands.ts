
import { scheduleEvent } from './schedule-event.js';
import { scheduler } from '@devvit/web/server';
import {
  getScheduledEvents,
  removeScheduledEvent,
} from './events-store.js';
import {
  formatScheduledTime,
  parseZonedScheduleTime,
} from './time-zones.js';
import { refreshAmaSidebar } from './sidebar.js';

export type ModMailCommandContext = {
  subredditName: string;
  conversationId: string;
  respond: (message: string) => Promise<void>;
  createdBy: string;
  conversationUser: string;
};

type CommandDefinition = {
  description: string;
  usage: string;
  minArgs: number;
  maxArgs?: number;
  execute: (
    args: string[],
    context: ModMailCommandContext
  ) => Promise<void> | void;
};

const commands: Record<string, CommandDefinition> = {
  test: {
    description: 'Test the Modmail command system.',
    usage: '!test <message>',
    minArgs: 1,
    execute: async (args, context) => {
        await context.respond(
        `Test command executed successfully.\n\nMessage: ${args.join(' ')}`
            );
        },
    },

  help: {
    description: 'List available commands.',
    usage: '!help',
    minArgs: 0,
    maxArgs: 0,
    execute: async (_args, context) => {
        const helpText = Object.entries(commands)
            .map(
            ([, command]) =>
                `- **${command.usage}** — ${command.description}`
            )
            .join('\n');

        await context.respond(
            `## Available Modmail Commands\n\n${helpText}`
        );
        },
    },
    
    
    schedule: {
    description: 'Schedule an event for a future date and time in a specified timezone. Optional "private" argument can be added to not make it appear on the sidebar.',
    usage: '!schedule "Title" YYYY-MM-DD <time> <timezone> [private]',
    minArgs: 4,
    execute: async (args, context) => {
        const isPrivate = args[args.length - 1]?.toLowerCase() === 'private';

        const timeZoneIndex = args.length - (isPrivate ? 2 : 1);
        const timeZoneInput = args[timeZoneIndex];
        const time = args[timeZoneIndex - 1];
        const date = args[timeZoneIndex - 2];

        let title = args.slice(0, timeZoneIndex - 2).join(' ').trim();

        // Remove optional quotes around the title.
        if (
        (title.startsWith('"') && title.endsWith('"')) ||
        (title.startsWith("'") && title.endsWith("'"))
        ) {
        title = title.slice(1, -1).trim();
        }

        if (!title || title.length > 100) {
        await context.respond(
            'The title must contain between 1 and 100 characters.'
        );
        return;
        }

        if (
        !date ||
        !time ||
        !timeZoneInput ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date)
        ) {
        await context.respond(
            'Invalid arguments.\n\n' +
            'Usage: `!schedule "Title" YYYY-MM-DD 4:00PM PT`\n\n' +
            'You can use 12-hour times such as `4:00PM` or 24-hour times such as `16:00`.\n\n' +
            'Timezones can be ET, CT, MT, PT, UTC, or an IANA name such as America/New_York.'
        );
        return;
        }

        let scheduledTime;

        try {
        scheduledTime = parseZonedScheduleTime(
            date,
            time,
            timeZoneInput
        );
        } catch (error) {
        await context.respond(
            error instanceof Error
            ? error.message
            : 'Could not interpret that date, time, and timezone.'
        );
        return;
        }

        const { runAt, timeZone, timeZoneLabel, localDateTime } =
        scheduledTime;

        const data = {
        title,
        runAt: runAt.toISOString(),
        createdAt: new Date().toISOString(),
        createdBy: context.createdBy,
        conversationUser: context.conversationUser,
        subredditName: context.subredditName,
        conversationId: context.conversationId,
        timeZone,
        timeZoneLabel,
        localDateTime,
        isPrivate,
        };

        try {
        const jobId = await scheduleEvent(data, runAt);
        await refreshAmaSidebar(context.subredditName);

        await context.respond(
            `## Scheduled AMA Created: ${title}\n\n` +
            `**Scheduled for:** ${formatScheduledTime(data)}\n\n` +
            `**Host:** u/${context.conversationUser}\n\n` +
            `**Created by:** u/${context.createdBy}\n\n` +
            `**Job ID:** \`${jobId}\``
        );
        } catch (error) {
        console.error('[schedule] Failed to create job:', error);
        await context.respond(
            'Failed to create the schedule. Check the app logs and try again.'
        );
        }
    },
    },

    list: {
    description: 'List upcoming scheduled events.',
    usage: '!list',
    minArgs: 0,
    maxArgs: 0,
    execute: async (_args, context) => {
      try {
        const events = await getScheduledEvents();
        const jobs = await scheduler.listJobs();
        const activeJobIds = new Set(jobs.map((job) => job.id));
        const now = Date.now();

        // Remove records for jobs that no longer exist.
        for (const event of events) {
          if (!activeJobIds.has(event.jobId)) {
            await removeScheduledEvent(event.jobId);
          }
        }

        const upcoming = events.filter(
          (event) =>
            activeJobIds.has(event.jobId) &&
            new Date(event.runAt).getTime() > now
        );

        if (upcoming.length === 0) {
          await context.respond('There are no upcoming scheduled AMAs.');
          return;
        }

        const eventList = upcoming
          .map(
            (event) =>
              `- **${event.title}**\n` +
              `  - **When:** ${formatScheduledTime(event)}\n\n` +
              `  - **ID:** \`${event.jobId}\`\n` +
              `  - **Host:** u/${event.conversationUser}`
          )
          .join('\n');

        await context.respond(
          `## Upcoming Scheduled Events\n\n${eventList}\n\n` +
          'Use `!cancel <id>` to cancel an event.'
        );
      } catch (error) {
        console.error('[list] Failed to list scheduled AMAs:', error);
        await context.respond(
          'Failed to retrieve scheduled AMAs. Check the app logs and try again.'
        );
      }
    },
  },
    cancel: {
    description: 'Cancel a scheduled event by its job ID.',
    usage: '!cancel <id>',
    minArgs: 1,
    maxArgs: 1,
    execute: async (args, context) => {
      const jobId = args[0];

      if (!jobId) {
        await context.respond('Usage: `!cancel <id>`');
        return;
     }

      try {
        const events = await getScheduledEvents();
        const event = events.find((item) => item.jobId === jobId);

        if (!event) {
          await context.respond(
            `No scheduled event was found with ID \`${jobId}\`.\n\n` +
            'Use `!list` to see upcoming events and their IDs.'
          );
          return;
        }

        if (new Date(event.runAt).getTime() <= Date.now()) {
          await removeScheduledEvent(jobId);
          await refreshAmaSidebar(context.subredditName);
          await context.respond(
            'This event has already reached its scheduled time and cannot be cancelled.'
          );
          return;
        }

        await scheduler.cancelJob(jobId);
        await removeScheduledEvent(jobId);
        await refreshAmaSidebar(context.subredditName);

        await context.respond(
          `## Scheduled AMA Cancelled\n\n` +
          `**Event:** ${event.title}\n\n` +
          `**Previously scheduled for:** ${formatScheduledTime(event)}\n\n` +
          `**Job ID:** \`${jobId}\``
        );
      } catch (error) {
        console.error('[cancel] Failed to cancel scheduled event:', error);
        await context.respond(
          'Failed to cancel the event. It may have already fired, or the scheduler may be unavailable. Try `!list` to check the current events.'
        );
      }
    },
  },

};

export async function dispatchModMailCommand(
  name: string,
  args: string[],
  context: ModMailCommandContext
): Promise<void> {
  const command = commands[name.toLowerCase()];

  if (!command) {
    await context.respond(
        `Unknown command: \`${name}\`.\n\nUse \`!help\` to see available commands.`
    );
    return;
  }

  if (
    args.length < command.minArgs ||
    (command.maxArgs !== undefined && args.length > command.maxArgs)
    ) {
    await context.respond(
        `Incorrect arguments.\n\nUsage: \`${command.usage}\``
    );
    return;
  }

  await command.execute(args, context);
}