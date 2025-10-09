import { type CommandDefinition } from './common';

export const shareCommands: CommandDefinition[] = [
  {
    id: 'share.create',
    summary: 'Create a share link',
    description: 'Creates a shareable link of the current grid state.',
    patterns: [{ pattern: 'share', help: 'create a share link' }],
    handler: async ({ engine, services }) => {
      const url = await services.shareLinks?.create(engine.toSnapshot());
      if (!url) return { ok: false, msg: 'failed to create share link' };
      return { ok: true, msg: `share link created: ${url}` };
    },
  },
];