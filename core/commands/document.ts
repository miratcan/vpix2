import { type CommandDefinition } from './common';

export const documentCommands: CommandDefinition[] = [
  {
    id: 'document.save',
    summary: 'Save document',
    description: 'Saves the current document to local storage.',
    patterns: [{ pattern: 'save', help: 'save document' }],
    handler: ({ services }) => {
      services.documents?.save();
      return { ok: true, msg: 'document saved' };
    },
  },
  {
    id: 'document.load',
    summary: 'Load document',
    description: 'Loads the document from local storage.',
    patterns: [{ pattern: 'load', help: 'load document' }],
    handler: ({ services }) => {
      services.documents?.load();
      return { ok: true, msg: 'document loaded' };
    },
  },
];