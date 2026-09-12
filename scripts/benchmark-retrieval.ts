import { performance } from 'node:perf_hooks';
import { retrieve, type RetrievalDocument } from '../src/retrieval.js';

const base: RetrievalDocument = {
  title: 'Synthetic Tauri documentation section',
  section: 'Synthetic > Configuration',
  context: 'Configure tauri.conf.json and application permissions.',
  keywords: ['configuration', 'tauri.conf.json', 'permissions'],
  url: 'https://v2.tauri.app/synthetic/configuration/',
};
const documents = Array.from({ length: 10_000 }, (_, index) => ({
  ...base,
  url: `${base.url}${index}`,
}));
const started = performance.now();
const results = retrieve(documents, 'tauri.conf.json permissions', 10);
const elapsedMs = performance.now() - started;
if (
  results.length !== 10 ||
  results.some((result) => result.snippet.length > 1200)
) {
  throw new Error('benchmark safety assertions failed');
}
console.log(
  `retrieval benchmark: ${documents.length} docs, ${elapsedMs.toFixed(1)}ms, ${results.length} bounded results`,
);
console.log('informational only; not a production latency claim');
