// Minimal logger utility to silence noisy logs during tests and be browser-safe
// Debug enable precedence (first truthy wins):
//  - window.DEBUG (boolean)
//  - localStorage.DEBUG === 'true'
//  - import.meta.env.VITE_DEBUG truthy
//  - process.env.DEBUG (Node/tests)

function getIsDebug(): boolean {
  try {
    // window.DEBUG
    if (typeof window !== 'undefined' && (window as any).DEBUG != null) {
      return Boolean((window as any).DEBUG);
    }
  } catch {}
  try {
    // localStorage.DEBUG
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      const v = window.localStorage.getItem('DEBUG');
      if (v != null) return v === 'true';
    }
  } catch {}
  try {
    // import.meta.env (Vite)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const viteDebug = (import.meta as any)?.env?.VITE_DEBUG;
    if (viteDebug != null) return !!viteDebug && viteDebug !== '0' && viteDebug !== 'false';
  } catch {}
  try {
    // process.env (Node/tests)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pe: any = (typeof process !== 'undefined' ? (process as any) : undefined);
    const dbg = pe?.env?.DEBUG;
    if (dbg != null) return !!dbg && dbg !== '0' && dbg !== 'false';
  } catch {}
  return false;
}

const isDebug = getIsDebug();

export const logger = {
  debug: (...args: any[]) => {
    if (isDebug) {
      // eslint-disable-next-line no-console
      console.log(...args);
    }
  },
  warn: (...args: any[]) => {
    // Keep warnings visible but allow mute via DEBUG as well if desired
    if (isDebug) {
      // eslint-disable-next-line no-console
      console.warn(...args);
    }
  },
  error: (...args: any[]) => {
    // Errors should remain visible in tests; forward always
    // eslint-disable-next-line no-console
    console.error(...args);
  },
};

export default logger;
