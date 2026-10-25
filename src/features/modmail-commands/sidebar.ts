
import { reddit } from '@devvit/web/server';
import { getScheduledEvents } from './events-store.js';
import { formatScheduledTime } from './time-zones.js';

const SIDEBAR_WIDGET_NAME = 'Upcoming AMAs';


function formatSidebarTime(event: {
  runAt: string;
  localDateTime?: string;
  timeZoneLabel?: string;
  timeZone?: string;
}): string {
  return formatScheduledTime(event);
}


function escapeTableText(value: string): string {
  return value
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ')
    .trim();
}

export async function refreshAmaSidebar(
  subredditName: string
): Promise<void> {
  const now = Date.now();

  const events = (await getScheduledEvents())
    .filter((event) => new Date(event.runAt).getTime() > now)
    .sort(
      (a, b) =>
        new Date(a.runAt).getTime() -
        new Date(b.runAt).getTime()
    );

  const rows = events.map(
    (event) =>
      `| ${escapeTableText(event.title)} | ${formatSidebarTime(event)} |`
  );

  const text = [
    '| Title | Date/time |',
    '|---|---|',
    ...(rows.length > 0
      ? rows
      : ['| No upcoming AMAs scheduled | — |']),
  ].join('\n');

  const widgets = await reddit.getWidgets(subredditName);

  const existingWidget = widgets.find(
    (widget) => widget.name === SIDEBAR_WIDGET_NAME
  );

  if (existingWidget) {
    await reddit.updateWidget({
      type: 'textarea',
      subreddit: subredditName,
      id: existingWidget.id,
      shortName: SIDEBAR_WIDGET_NAME,
      text,
    });
  } else {
    await reddit.addWidget({
      type: 'textarea',
      subreddit: subredditName,
      shortName: SIDEBAR_WIDGET_NAME,
      text,
    });
  }
}
