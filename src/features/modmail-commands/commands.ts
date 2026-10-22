export type ModMailCommandContext = {
  subredditName: string;
  conversationId: string;
  respond: (message: string) => Promise<void>;
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