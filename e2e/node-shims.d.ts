// The Node APIs the E2E fixtures use (the project has no @types/node).
declare module 'node:fs' {
  export function readFileSync(path: string, encoding: 'utf8'): string;
}

declare module 'node:url' {
  export function fileURLToPath(url: URL | string): string;
}
declare module 'node:process' {
  export const env: Record<string, string | undefined>;
}
