import { describe, expect, it } from 'vitest';
import {
  loadConfigExamples,
  validateConfigExamples,
} from '../scripts/check-release-metadata.js';

describe('agent configuration examples', () => {
  it('uses stdio, the published package, and implemented read-only tools', async () => {
    const examples = await loadConfigExamples();
    expect(validateConfigExamples(examples)).toEqual({ ok: true });
  });
});
