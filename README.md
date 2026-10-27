# AMA Scheduler

A Reddit moderator tool for scheduling AMAs, managing upcoming events, and notifying your team through Discord.

AMA Scheduler lets moderators create scheduled AMA events directly through Reddit Modmail. Scheduled events can be announced in a configured Discord channel, with optional role mentions, and displayed in a subreddit sidebar widget.

## Features

- **Schedule AMAs:** Create events for a specific date and time using moderator Modmail commands.
- **Timezone support:** Enter times using common US timezone abbreviations, UTC, or supported IANA timezone identifiers.
- **12-hour and 24-hour time formats:** Use formats such as `4:00PM` or `16:00`.
- **List upcoming events:** Review scheduled events and their associated details.
- **Cancel events:** Cancel scheduled events before they run.
- **Discord notifications:** Automatically send a Discord webhook notification when a scheduled event fires.
- **Optional Discord role mentions:** Configure a Discord role to ping when an event notification is sent.
- **Subreddit sidebar:** Display upcoming public AMAs in a sidebar widget, automatically updating as events are scheduled, canceled, or completed.
- **Private events:** Schedule events that remain manageable by moderators and can trigger Discord notifications but are excluded from the public sidebar.

## Requirements

- A subreddit where the app is installed and has the required moderator permissions.
- Access to Reddit Modmail.
- A Discord server and incoming webhook for Discord notifications (optional).
- A Discord role ID if role mentions are desired.

## Configuration

After installing the app, configure its subreddit settings in Reddit's app settings.

### Discord Webhook URL

Enter the Discord incoming webhook URL for the channel where scheduled AMA notifications should appear.

If no webhook is configured, scheduled events can still be managed and executed, but Discord notifications are skipped.

**Keep this URL private.** Anyone with access to the webhook URL may be able to send messages to its associated Discord channel.

### Discord Role ID

Optionally enter the numeric ID of the Discord role to mention when an event notification is sent.

Leave this field blank to disable role mentions. Discord notifications will only mention the configured role when its ID is valid.

## Usage

Commands are entered as internal notes in Reddit Modmail. Only commands written by moderators in internal Modmail messages are processed; automatically generated messages are ignored.

### Schedule an event

Use the `!schedule` command followed by the event title, date, time, timezone, and optional privacy flag.

Example:

`!schedule "Example AMA" 2026-11-10 4:00PM PT`

This schedules an AMA for November 10, 2026, at 4:00 PM Pacific Time.

A 24-hour time can also be used:

`!schedule "Example AMA" 2026-11-10 16:00 PT`

To create a private event, append `private`:

`!schedule "Private AMA" 2026-11-10 4:00PM PT private`

Private events are excluded from the public sidebar, but remain available through the event-management commands and can still generate Discord notifications.

### List scheduled events

Use:

`!list`

This displays scheduled events, including their scheduled times and the information needed to manage them.

### Cancel an event

Use:

`!cancel`

Follow the command's response to identify and cancel the intended event.

### Get help

Use:

`!help`

This provides help for the available Modmail commands.

### Test the integration

Use:

`!test`

This is available for testing the command integration.

## Timezones

The scheduler supports common US timezone abbreviations, including:

- `ET` — Eastern Time
- `CT` — Central Time
- `MT` — Mountain Time
- `PT` — Pacific Time
- `UTC` and `GMT`

Supported IANA timezone identifiers can also be used, such as `America/Los_Angeles` or `America/New_York`.

The scheduler converts the requested local time into a scheduled instant. Ambiguous or nonexistent local times caused by daylight saving time transitions are rejected rather than silently interpreted.

## Discord Notifications

When a scheduled event fires, the app attempts to send a Discord message containing the event title, scheduled time, time entered, host username, subreddit, and moderator who created the event.

If a valid Discord role ID is configured, the notification can also mention that role.

A Discord notification failure does not prevent the scheduler from acknowledging the event task. Check the app logs if notifications are not being delivered.

## Sidebar Behavior

The app maintains an **Upcoming AMAs** subreddit sidebar widget.

The widget lists future, public events in chronological order. It is refreshed when events are scheduled, canceled, or completed. Private events are excluded from the public listing.

If no public upcoming events exist, the widget displays a message indicating that no upcoming AMAs are scheduled.

## Data and Privacy

The app stores scheduled event records using Reddit's app storage. These records include event details, scheduling information, the associated subreddit, the moderator who created the event, the host username, and identifiers used to manage the scheduled task.

When Discord notifications are enabled, relevant event information is sent to the configured Discord webhook. This may include usernames and subreddit information.

The app uses Reddit's Modmail API to retrieve conversations and respond with internal notes. It does not intentionally process ordinary non-moderator messages as commands.

For more information, see:

- [Privacy Policy](YOUR_PRIVACY_POLICY_URL)
- [Terms of Service](YOUR_TERMS_OF_SERVICE_URL)

## Permissions and External Services

The app uses Reddit's moderator-scoped API access to process Modmail commands and manage the subreddit sidebar widget. It also uses Reddit app storage to retain scheduled event records and the Devvit scheduler to execute events at their configured times.

### Fetch Domains

- `discord.com` — sends scheduled event notifications to the Discord incoming webhook configured by the subreddit moderators.

## Development

The project uses TypeScript, Hono, and the Reddit Devvit Web platform.

Install dependencies:

```bash
npm install
```

Build the app:

```bash
npm run build
```

For Devvit CLI commands and publishing instructions, consult the [Reddit Developer Documentation](https://developers.reddit.com/docs).

## Project Information

- **Platform:** Reddit Devvit
- **License:** [YOUR_LICENSE]
