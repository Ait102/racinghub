/** Article titles, not URLs or MediaWiki namespaces. */
export function validArticle(title: string): boolean {
  return (
    title.trim().length > 0 &&
    title.length <= 255 &&
    !/[:#<>[\]{}|]/.test(title) &&
    ![...title].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
  );
}
