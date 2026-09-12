export type DocEntry = {
  title: string;
  url: string;
  section: string;
  context: string;
  version: 'Tauri 2';
  versionSensitive: boolean;
  keywords: string[];
};

export const DOC_INDEX: readonly DocEntry[] = [
  {
    title: 'Capabilities',
    url: 'https://v2.tauri.app/security/capabilities/',
    section: 'Security > Capabilities',
    context: 'Define permissions and scopes for Tauri 2 applications.',
    version: 'Tauri 2',
    versionSensitive: true,
    keywords: ['capabilities', 'permissions', 'security', 'scope'],
  },
  {
    title: 'Window Customization',
    url: 'https://v2.tauri.app/learn/window-customization/',
    section: 'Learn > Window Customization',
    context: 'Configure native windows, decorations, size, and behavior.',
    version: 'Tauri 2',
    versionSensitive: true,
    keywords: ['window', 'windows', 'customization', 'decorations'],
  },
  {
    title: 'IPC',
    url: 'https://v2.tauri.app/concept/inter-process-communication/',
    section: 'Concepts > Inter-Process Communication',
    context:
      'Communicate between the webview frontend and Rust backend with commands and events.',
    version: 'Tauri 2',
    versionSensitive: true,
    keywords: ['ipc', 'invoke', 'commands', 'events', 'communication'],
  },
  {
    title: 'Calling Rust from the Frontend',
    url: 'https://v2.tauri.app/develop/calling-rust/',
    section: 'Develop > Calling Rust',
    context: 'Invoke registered Rust commands from JavaScript or TypeScript.',
    version: 'Tauri 2',
    versionSensitive: true,
    keywords: ['rust', 'frontend', 'invoke', 'commands'],
  },
  {
    title: 'Project Structure',
    url: 'https://v2.tauri.app/start/project-structure/',
    section: 'Start > Project Structure',
    context: 'Understand the Tauri application and source layout.',
    version: 'Tauri 2',
    versionSensitive: true,
    keywords: ['project', 'structure', 'src-tauri', 'layout'],
  },
  {
    title: 'Configuration',
    url: 'https://v2.tauri.app/reference/config/',
    section: 'Reference > Configuration',
    context:
      'Configure Tauri using tauri.conf.json and platform-specific settings.',
    version: 'Tauri 2',
    versionSensitive: true,
    keywords: ['configuration', 'tauri.conf.json', 'config'],
  },
  {
    title: 'Plugins',
    url: 'https://v2.tauri.app/develop/plugins/',
    section: 'Develop > Plugins',
    context: 'Extend Tauri applications with official and custom plugins.',
    version: 'Tauri 2',
    versionSensitive: true,
    keywords: ['plugins', 'plugin', 'extend'],
  },
  {
    title: 'State Management',
    url: 'https://v2.tauri.app/develop/state-management/',
    section: 'Develop > State Management',
    context: 'Manage shared application state and access it from commands.',
    version: 'Tauri 2',
    versionSensitive: true,
    keywords: ['state', 'management', 'mutex', 'managed state'],
  },
  {
    title: 'Application Distribution',
    url: 'https://v2.tauri.app/distribute/',
    section: 'Distribute',
    context:
      'Bundle and distribute Tauri applications for supported platforms.',
    version: 'Tauri 2',
    versionSensitive: true,
    keywords: ['distribution', 'bundle', 'release', 'installer'],
  },
  {
    title: 'Tauri CLI',
    url: 'https://v2.tauri.app/reference/cli/',
    section: 'Reference > CLI',
    context:
      'Use the Tauri command-line interface to develop and build applications.',
    version: 'Tauri 2',
    versionSensitive: true,
    keywords: ['cli', 'command line', 'build', 'dev'],
  },
];

export type SearchInput = { query: string; limit?: number };
export type SearchError = {
  code: 'INVALID_QUERY' | 'INVALID_LIMIT';
  message: string;
};
export type SearchValidation =
  | { ok: true; value: { query: string; limit: number } }
  | { ok: false; error: SearchError };

export function validateSearchInput(input: unknown): SearchValidation {
  if (
    !input ||
    typeof input !== 'object' ||
    typeof (input as any).query !== 'string'
  ) {
    return {
      ok: false,
      error: {
        code: 'INVALID_QUERY',
        message: 'query must contain 1-200 non-whitespace characters',
      },
    };
  }
  const query = (input as any).query.trim();
  if (query.length < 1 || query.length > 200) {
    return {
      ok: false,
      error: {
        code: 'INVALID_QUERY',
        message: 'query must contain 1-200 non-whitespace characters',
      },
    };
  }
  const limit = (input as any).limit ?? 5;
  if (!Number.isInteger(limit) || limit < 1 || limit > 10) {
    return {
      ok: false,
      error: {
        code: 'INVALID_LIMIT',
        message: 'limit must be an integer between 1 and 10',
      },
    };
  }
  return { ok: true, value: { query, limit } };
}

export function searchDocs(input: SearchInput): DocEntry[] {
  const validation = validateSearchInput(input);
  if (!validation.ok) throw new Error(validation.error.message);
  const terms = validation.value.query.toLowerCase().split(/\s+/);
  return DOC_INDEX.map((entry, index) => {
    const title = entry.title.toLowerCase();
    const searchable = [title, entry.section, entry.context, ...entry.keywords]
      .join(' ')
      .toLowerCase();
    const score = terms.reduce(
      (total, term) =>
        total +
        (title === term ? 100 : title.includes(term) ? 50 : 0) +
        (entry.keywords.includes(term) ? 30 : 0) +
        (searchable.includes(term) ? 5 : 0),
      0,
    );
    return { entry, score, index };
  })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, validation.value.limit)
    .map(({ entry }) => entry);
}
