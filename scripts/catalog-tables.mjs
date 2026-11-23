import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export function archiveText(directory, archive, member) {
  return execFileSync('tar', ['-xOf', join(directory, archive), member], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  });
}

export function table(text, delimiter = ',') {
  const lines = delimiter === '\t' ? text.trimEnd().split(/\r?\n/u).map((line) => line.split('\t')) : parseCsv(text);
  const [fields, ...rows] = lines;
  fields[0] = fields[0].replace(/^\uFEFF/u, '');
  return rows.map((values) => Object.fromEntries(fields.map((key, index) => [key, values[index] ?? ''])));
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        value += char;
        index++;
      } else if (char === '"') quoted = false;
      else value += char;
    } else if (char === '"' && !value) quoted = true;
    else if (char === ',') {
      row.push(value);
      value = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index++;
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
    } else value += char;
  }
  if (quoted) throw new Error('Unterminated quoted CSV field');
  if (row.length || value) rows.push([...row, value]);
  return rows;
}

export async function fileTable(directory, name) {
  return table(await readFile(join(directory, name), 'utf8'));
}
