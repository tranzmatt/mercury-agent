export interface DefaultSkillSeed {
  dirName: string;
  fileName: string;
  content: string;
}

export const DEFAULT_SKILL_SEEDS: DefaultSkillSeed[] = [
  {
    dirName: 'web-search',
    fileName: 'SKILL.md',
    content: `---
name: web-search
description: Perform web searches using DuckDuckGo HTML and summarize sources.
version: 1.0.0
allowed-tools:
  - fetch_url
---

# Web Search

Use this skill when the user asks for current events, external facts, or web research.

## Workflow

1. Build a DuckDuckGo HTML search URL:
   - https://html.duckduckgo.com/html/?q=<query>
2. Use fetch_url with markdown format to retrieve result page content.
3. Extract likely source links and open the top relevant pages with fetch_url.
4. Cross-check key facts across at least 2 sources when possible.
5. Return a concise answer with source links and clear caveats.

## Rules

- Prefer reliable sources (official docs, primary sources, reputable publications).
- If information is uncertain or conflicting, say so explicitly.
- Include source URLs in the response.
- Avoid fabricated citations.
`,
  },
];
