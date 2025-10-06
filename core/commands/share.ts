import type { CommandDefinition } from './common';

export const shareCommands: CommandDefinition[] = [
  {
    id: 'share.link',
    summary: 'Store shareable link in history',
    handler: ({ engine, services }) => {
      const res = services.shareLinks.updateHistory(engine);
      return res.msg;
    },
    patterns: [{ pattern: 'link', help: 'link' }],
  },
  {
    id: 'share.copylink',
    summary: 'Copy shareable link to clipboard',
    handler: async ({ engine, services }) => {
      const res = await services.shareLinks.copyLink(engine);
      return res.msg;
    },
    patterns: [{ pattern: 'copylink', help: 'copylink' }],
  },
];
