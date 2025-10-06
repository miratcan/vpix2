// Mock Lospec fetch endpoints to avoid real network during tests

const ok = (data: any, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
  text: async () => (typeof data === 'string' ? data : JSON.stringify(data)),
});

globalThis.fetch = (async (input: RequestInfo | URL) => {
  const url = String(input);
  if (/lospec\.com\/palette-list\/[^/]+\.json$/i.test(url)) {
    // return a tiny palette payload
    return ok({ colors: ['000000', 'FFFFFF', 'FF0000', '00FF00'] });
  }
  if (/lospec\.com\/palette-list\.json$/i.test(url)) {
    // return some slugs for search
    return ok([
      { slug: 'pico-8', title: 'PICO-8' },
      { slug: 'sweetie-16', title: 'Sweetie 16' },
    ]);
  }
  // default not found
  return ok({}, 404) as any;
}) as any;

