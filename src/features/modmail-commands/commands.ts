
import { scheduleEvent } from './schedule-event.js';

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
    description: 'Schedule an event for a future UTC date and time.',
    usage: '!schedule "Title" YYYY-MM-DD HH:mm',
    minArgs: 3,
    execute: async (args, context) => {
        // The final two arguments are always the date and time.
        const time = args[args.length - 1];
        const date = args[args.length - 2];

        let title = args.slice(0, -2).join(' ').trim();

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

        // Require an exact date and 24-hour UTC time.
        if (!date || !time || args.length < 3) {
            await context.respond(
                'Usage: `!schedule "Title" YYYY-MM-DD HH:mm`'
            );
            return;
        }
        if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)
        ) {
        await context.respond(
            'Invalid date or time.\n\n' +
            'Usage: `!schedule "Title" YYYY-MM-DD HH:mm`\n' +
            'All times must be in UTC.'
        );
        return;
        }

        const runAt = new Date(`${date}T${time}:00.000Z`);

        // Reject impossible dates and times in the past.
        if (
        Number.isNaN(runAt.getTime()) ||
        runAt.toISOString().slice(0, 10) !== date ||
        runAt.toISOString().slice(11, 16) !== time ||
        runAt.getTime() <= Date.now()
        ) {
        await context.respond(
            'That date/time is invalid or has already passed. ' +
            'Please provide a future date and time in UTC.'
        );
        return;
        }

        const data = {
        title,
        runAt: runAt.toISOString(),
        createdAt: new Date().toISOString(),
        createdBy: context.createdBy,
        conversationUser: context.conversationUser,
        subredditName: context.subredditName,
        conversationId: context.conversationId,
        };

        try {
        const jobId = await scheduleEvent(data, runAt);

        await context.respond(
            `## Schedule Created\n\n` +
            `**Title:** ${title}\n\n` +
            `**Scheduled for:** ${runAt.toISOString().replace('T', ' ').replace('.000Z', ' UTC')}\n\n` +
            `**Created by:** u/${context.createdBy}\n\n` +
            `**Conversation user:** u/${context.conversationUser}\n\n` +
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