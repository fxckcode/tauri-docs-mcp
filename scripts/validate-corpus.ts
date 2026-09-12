#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  generateCorpus,
  validateManifest,
  type CorpusManifest,
  type GeneratedCorpus,
} from '../src/corpus.js';

const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(
  await readFile(resolve(root, 'corpus/manifest.json'), 'utf8'),
) as CorpusManifest;
const validation = validateManifest(manifest);
if (!validation.ok)
  throw new Error(`Invalid corpus manifest:\n${validation.errors.join('\n')}`);
const expected = generateCorpus(manifest);
const outputPath = resolve(root, 'corpus', manifest.snapshot, 'index.json');
const actual = JSON.parse(
  await readFile(outputPath, 'utf8'),
) as GeneratedCorpus;
if (actual.generated !== true)
  throw new Error('Generated corpus marker is missing');
if (JSON.stringify(actual) !== JSON.stringify(expected))
  throw new Error(`Generated corpus differs from manifest: ${outputPath}`);
if (actual.entries.length !== manifest.entries.length)
  throw new Error('Generated corpus entry count does not match manifest');
console.log(`Validated ${manifest.snapshot}: ${actual.entries.length} entries`);
