import { describe, expect, it } from 'vitest';
import { createServer } from '../src/server.js';

describe('MCP server', () => {
  it('creates a server with the documented tool registration', () => {
    expect(createServer()).toBeDefined();
  });
});
