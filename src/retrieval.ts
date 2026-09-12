import { boundedSnippet, RESOURCE_LIMITS } from './resource-limits.js';

export type RetrievalDocument = {
  title: string;
  section: string;
  context: string;
  keywords: readonly string[];
  url: string;
};

export type RetrievalHit<T extends RetrievalDocument> = {
  document: T;
  score: number;
  matches: string[];
  snippet: string;
};

export function normalizeText(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function tokenize(value: string): string[] {
  const normalized = normalizeText(value);
  return normalized
    ? [...new Set(normalized.split(' '))].slice(0, RESOURCE_LIMITS.maxTermCount)
    : [];
}

function containsWord(value: string, term: string): boolean {
  return value === term || value.split(' ').includes(term);
}

function scoreDocument<T extends RetrievalDocument>(
  document: T,
  query: string,
): RetrievalHit<T> {
  const terms = tokenize(query);
  const phrase = terms.join(' ');
  if (terms.length === 0) {
    return {
      document,
      score: 0,
      matches: [],
      snippet: boundedSnippet(document.context),
    };
  }
  const title = normalizeText(document.title);
  const heading = normalizeText(
    document.section.split(' > ').at(-1) ?? document.section,
  );
  const section = normalizeText(document.section);
  const body = normalizeText(document.context);
  const aliases = document.keywords.map(normalizeText);
  const fields: Array<[string, string]> = [
    ['title', title],
    ['heading', heading],
    ['section', section],
    ['body', body],
    ['alias', aliases.join(' ')],
  ];
  const matches = new Set<string>();
  const matchedTerms = new Set<string>();
  let score = 0;
  if (phrase && title === phrase) {
    score += 500;
    matches.add('title');
  }
  if (phrase && heading === phrase) {
    score += 450;
    matches.add('heading');
  }
  if (phrase && fields.some(([, value]) => value.includes(phrase))) {
    score += 250;
    matches.add('phrase');
  }
  for (const term of terms) {
    if (
      containsWord(title, term) ||
      containsWord(heading, term) ||
      containsWord(section, term) ||
      aliases.some((alias) => containsWord(alias, term)) ||
      containsWord(body, term)
    )
      matchedTerms.add(term);
    if (containsWord(title, term)) {
      score += title === term ? 180 : 70;
      matches.add('title');
    }
    if (containsWord(heading, term)) {
      score += heading === term ? 160 : 90;
      matches.add('heading');
    }
    if (containsWord(section, term)) {
      score += 45;
      matches.add('section');
    }
    if (aliases.some((alias) => containsWord(alias, term))) {
      score += 80;
      matches.add('alias');
    }
    if (containsWord(body, term)) {
      score += 15;
      matches.add('body');
    }
  }
  if (matchedTerms.size !== terms.length) score = 0;
  return {
    document,
    score,
    matches: [...matches],
    snippet: boundedSnippet(document.context),
  };
}

export function retrieve<T extends RetrievalDocument>(
  documents: readonly T[],
  query: string,
  limit: number,
): RetrievalHit<T>[] {
  return documents
    .map((document) => scoreDocument(document, query))
    .filter((hit) => hit.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || a.document.url.localeCompare(b.document.url),
    )
    .slice(0, limit);
}
