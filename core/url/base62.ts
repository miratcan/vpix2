const B62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export function toB62(n: number) {
  let x = Math.max(0, n | 0);
  if (x === 0) return '0';
  let s = '';
  while (x > 0) {
    s = B62[x % 62] + s;
    x = Math.floor(x / 62);
  }
  return s;
}

export function fromB62(s: string) {
  let n = 0;
  for (const ch of s) {
    const v = B62.indexOf(ch);
    if (v < 0) throw new Error('bad base62');
    n = n * 62 + v;
  }
  return n;
}
