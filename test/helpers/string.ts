export function dedent(str: string) {
  const lines = String(str).replace(/\r\n?/g, '\n').split('\n');
  while (lines.length && lines[0].trim() === '') lines.shift();
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  const indents = lines
    .filter((l) => l.trim().length > 0)
    .map((l) => (l.match(/^(\s*)/) || ['',''])[1].length);
  const min = indents.length ? Math.min(...indents) : 0;
  return lines.map((l) => l.slice(Math.min(min, l.length))).join('\n');
}

