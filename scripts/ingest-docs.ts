#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  generateCorpus,
  validateManifest,
  type CorpusManifest,
  type GeneratedCorpus,
} from '../src/corpus.js';

const root = resolve(import.meta.dirname, '..');
const manifestPath = resolve(root, 'corpus/manifest.json');
const manifest = JSON.parse(
  await readFile(manifestPath, 'utf8'),
) as CorpusManifest;
const validation = validateManifest(manifest);
if (!validation.ok) throw new Error(validation.errors.join('\n'));
const corpus = generateCorpus(manifest);
const snapshotDir = resolve(root, 'corpus', manifest.snapshot);
const outputPath = resolve(snapshotDir, 'index.json');
const serialized = `${JSON.stringify(corpus, null, 2)}\n`;
await mkdir(snapshotDir, { recursive: true });
try {
  const existing = await readFile(outputPath, 'utf8');
  if (existing !== serialized) {
    throw new Error(
      process.argv.includes('--check')
        ? `Generated corpus differs from manifest: ${outputPath}`
        : `Refusing to overwrite immutable snapshot: ${outputPath}`,
    );
  }
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  if (process.argv.includes('--check'))
    throw new Error(`Generated corpus is missing: ${outputPath}`, {
      cause: error,
    });
  await writeFile(outputPath, serialized, 'utf8');
}
if (process.argv.includes('--check')) {
  const parsed = JSON.parse(
    await readFile(outputPath, 'utf8'),
  ) as GeneratedCorpus;
  if (
    parsed.generated !== true ||
    JSON.stringify(parsed, null, 2) + '\n' !== serialized
  )
    throw new Error('Generated corpus is malformed or not deterministic');
}
console.log(
  `Corpus ${manifest.snapshot}: ${manifest.entries.length} entries at ${outputPath}`,
);
