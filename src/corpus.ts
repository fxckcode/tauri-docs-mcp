import { createHash } from 'node:crypto';

export const ALLOWED_HOST = 'v2.tauri.app';
const SNAPSHOT_PATTERN = /^tauri-2@[A-Za-z0-9][A-Za-z0-9._-]*$/;

export type ManifestEntry = {
  url: string;
  title: string;
  section: string[];
  version: 'Tauri 2';
  sourceRevision: string;
  fetchedAt: string;
  content: string;
  contentHash: string;
  keywords: string[];
};

export type CorpusManifest = {
  snapshot: string;
  generatedAt: string;
  sourceRepository: string;
  sourceLicense: 'MIT';
  entries: ManifestEntry[];
};

export type GeneratedCorpus = {
  generated: true;
  snapshot: string;
  generatedAt: string;
  sourceRevision: string;
  entries: Array<{
    title: string;
    url: string;
    section: string;
    context: string;
    version: 'Tauri 2';
    versionSensitive: true;
    sourceRevision: string;
    fetchedAt: string;
    contentHash: string;
    keywords: string[];
  }>;
};

export function contentHash(content: string): string {
  return `sha256:${createHash('sha256').update(content, 'utf8').digest('hex')}`;
}

export function canonicalizeUrl(value: string): string | undefined {
  try {
    const parsed = new URL(value);
    if (
      parsed.protocol !== 'https:' ||
      parsed.hostname !== ALLOWED_HOST ||
      (parsed.port !== '' && parsed.port !== '443') ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash
    )
      return undefined;
    return parsed.href;
  } catch {
    return undefined;
  }
}

function canonicalUrlKey(value: string): string | undefined {
  const canonicalUrl = canonicalizeUrl(value);
  if (!canonicalUrl) return undefined;
  const parsed = new URL(canonicalUrl);
  if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/'))
    parsed.pathname = parsed.pathname.slice(0, -1);
  return parsed.href;
}

export function validateManifest(
  value: unknown,
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!value || typeof value !== 'object')
    return { ok: false, errors: ['manifest must be an object'] };
  const manifest = value as Partial<CorpusManifest>;
  if (
    typeof manifest.snapshot !== 'string' ||
    !SNAPSHOT_PATTERN.test(manifest.snapshot)
  )
    errors.push('snapshot must be immutable and match tauri-2@<revision>');
  if (
    typeof manifest.generatedAt !== 'string' ||
    Number.isNaN(Date.parse(manifest.generatedAt))
  )
    errors.push('generatedAt metadata is required');
  if (manifest.sourceRepository !== 'https://github.com/tauri-apps/tauri-docs')
    errors.push('sourceRepository must be the official Tauri docs repository');
  if (manifest.sourceLicense !== 'MIT')
    errors.push('sourceLicense must preserve the official MIT license');
  if (!Array.isArray(manifest.entries) || manifest.entries.length === 0)
    errors.push('entries must be non-empty');
  if (!Array.isArray(manifest.entries)) return { ok: false, errors };

  const urls = new Set<string>();
  for (const [index, entry] of manifest.entries.entries()) {
    const prefix = `entry ${index}`;
    if (!entry || typeof entry !== 'object') {
      errors.push(`${prefix} is invalid`);
      continue;
    }
    const item = entry as Partial<ManifestEntry>;
    const canonicalUrl =
      typeof item.url === 'string' ? canonicalizeUrl(item.url) : undefined;
    const urlKey =
      typeof item.url === 'string' ? canonicalUrlKey(item.url) : undefined;
    if (!canonicalUrl) {
      let parsed: URL | undefined;
      try {
        parsed = new URL(item.url ?? '');
      } catch {
        errors.push(`${prefix} URL is invalid`);
      }
      if (!parsed || parsed.protocol !== 'https:')
        errors.push(`${prefix} URL must use HTTPS`);
      errors.push(`${prefix} URL is not allowlisted`);
    }
    if (urlKey && urls.has(urlKey)) errors.push(`${prefix} URL is duplicated`);
    if (urlKey) urls.add(urlKey);
    if (typeof item.title !== 'string' || !item.title.trim())
      errors.push(`${prefix} title is required`);
    if (
      !Array.isArray(item.section) ||
      item.section.length === 0 ||
      item.section.some((part) => typeof part !== 'string' || !part.trim())
    )
      errors.push(`${prefix} section hierarchy is invalid`);
    if (item.version !== 'Tauri 2')
      errors.push(`${prefix} version must be Tauri 2`);
    if (typeof item.sourceRevision !== 'string' || !item.sourceRevision.trim())
      errors.push(`${prefix} sourceRevision metadata is required`);
    if (
      typeof item.fetchedAt !== 'string' ||
      Number.isNaN(Date.parse(item.fetchedAt))
    )
      errors.push(`${prefix} fetchedAt metadata is required`);
    if (typeof item.content !== 'string' || !item.content.trim())
      errors.push(`${prefix} content must not be empty`);
    if (
      typeof item.contentHash !== 'string' ||
      item.contentHash !== contentHash(item.content ?? '')
    )
      errors.push(`${prefix} content hash does not match content`);
    if (
      !Array.isArray(item.keywords) ||
      item.keywords.some(
        (keyword) => typeof keyword !== 'string' || !keyword.trim(),
      )
    )
      errors.push(`${prefix} keywords are invalid`);
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}

export function generateCorpus(manifest: CorpusManifest): GeneratedCorpus {
  const validation = validateManifest(manifest);
  if (!validation.ok)
    throw new Error(`Invalid corpus manifest: ${validation.errors.join('; ')}`);
  return {
    generated: true,
    snapshot: manifest.snapshot,
    generatedAt: manifest.generatedAt,
    sourceRevision: manifest.entries[0].sourceRevision,
    entries: manifest.entries.map((entry) => ({
      title: entry.title,
      url: canonicalizeUrl(entry.url)!,
      section: entry.section.join(' > '),
      context: entry.content,
      version: entry.version,
      versionSensitive: true,
      sourceRevision: entry.sourceRevision,
      fetchedAt: entry.fetchedAt,
      contentHash: entry.contentHash,
      keywords: [...entry.keywords],
    })),
  };
}
