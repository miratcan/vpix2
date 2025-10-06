import VPixEngine from '../engine';

import type { CommandDefinition } from './common';

export const documentCommands: CommandDefinition[] = [
  {
    id: 'document.read',
    summary: 'Load last saved document',
    handler: ({ engine, services }) => {
      if (!services.documents) return 'storage not available';
      const doc = services.documents.load();
      if (!doc) return 'No saved document';
      engine.loadSnapshot(doc);
      return 'document loaded';
    },
    patterns: [{ pattern: 'read', help: 'read' }],
  },
  {
    id: 'document.read-json',
    summary: 'Load document from JSON',
    handler: ({ engine }, { doc }) => {
      try {
        const raw = typeof doc === 'string' ? doc : JSON.stringify(doc);
        const loaded = VPixEngine.deserialize(raw);
        engine.loadSnapshot(loaded.toSnapshot());
        return 'document loaded';
      } catch {
        return 'invalid json';
      }
    },
    patterns: [{ pattern: 'read json {doc:json}', help: 'read json <{...}>' }],
  },
  {
    id: 'document.read-url',
    summary: 'Fetch and load document from URL',
    handler: async ({ engine, services }, { url }) => {
      const fetchImpl = services.fetch;
      if (!fetchImpl) return 'network unavailable';
      try {
        const txt = await fetchImpl(String(url)).then((r) => r.text());
        const loaded = VPixEngine.deserialize(txt);
        engine.loadSnapshot(loaded.toSnapshot());
        return 'document loaded';
      } catch {
        return 'network error';
      }
    },
    patterns: [{ pattern: 'read url {url:url}', help: 'read url <https://...>' }],
  },
];
