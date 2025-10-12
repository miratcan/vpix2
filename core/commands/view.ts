import type { CommandDefinition } from './common';

export const viewCommands: CommandDefinition[] = [
  {
    id: 'view.toggle-crosshair',
    summary: 'Toggle crosshair cursor display',
    handler: ({ engine }) => {
      engine.toggleCrosshair();
      return engine.showCrosshair ? 'Crosshair enabled.' : 'Crosshair disabled.';
    },
    patterns: [{ pattern: 'crosshair', help: 'crosshair' }],
  },
  {
    id: 'view.add-guide-vertical',
    summary: 'Add vertical guide at cursor X position',
    handler: ({ engine }) => {
      const x = engine.cursor.x;
      engine.addGuideX(x);
      return `Added vertical guide at x=${x}.`;
    },
    patterns: [{ pattern: 'guide v', help: 'guide v' }, { pattern: 'guide vertical', help: 'guide vertical' }],
  },
  {
    id: 'view.add-guide-horizontal',
    summary: 'Add horizontal guide at cursor Y position',
    handler: ({ engine }) => {
      const y = engine.cursor.y;
      engine.addGuideY(y);
      return `Added horizontal guide at y=${y}.`;
    },
    patterns: [{ pattern: 'guide h', help: 'guide h' }, { pattern: 'guide horizontal', help: 'guide horizontal' }],
  },
  {
    id: 'view.clear-guides',
    summary: 'Clear all guides',
    handler: ({ engine }) => {
      engine.clearGuides();
      return 'All guides cleared.';
    },
    patterns: [{ pattern: 'guide clear', help: 'guide clear' }],
  },
];
