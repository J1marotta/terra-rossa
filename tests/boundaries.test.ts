import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const projectRoot = resolve(import.meta.dirname, '..');

function sourceFiles(directory: string): string[] {
  return readdirSync(directory)
    .flatMap((entry) => {
      const path = join(directory, entry);
      return statSync(path).isDirectory() ? sourceFiles(path) : [path];
    })
    .filter((path) => path.endsWith('.ts') || path.endsWith('.tsx'));
}

function forbiddenImports(sourceDirectory: string, forbiddenSegment: string) {
  return sourceFiles(resolve(projectRoot, sourceDirectory)).flatMap((path) => {
    const source = readFileSync(path, 'utf8');
    const imports = source.matchAll(/(?:from\s+|import\s*\()["']([^"']+)["']/g);

    return Array.from(imports)
      .map((match) => match[1])
      .filter((specifier): specifier is string => specifier !== undefined)
      .filter((specifier) => specifier.includes(forbiddenSegment))
      .map((specifier) => `${relative(projectRoot, path)} -> ${specifier}`);
  });
}

describe('workspace boundaries', () => {
  it('keeps server modules out of the client', () => {
    expect(forbiddenImports('client', '/server')).toEqual([]);
  });

  it('keeps client modules out of the server', () => {
    expect(forbiddenImports('server', '/client')).toEqual([]);
  });
});
