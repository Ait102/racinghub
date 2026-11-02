// Free photos from Wikimedia Commons with their attribution (author and licence).
// Only files hosted on Commons are used: everything there is freely licensed, while
// files kept on Wikipedia itself may be non-free (logos, posters) and are skipped.
// A missing photo is never an error: the page simply shows none.

import { createClient } from './client';

export interface CommonsPhoto {
  /** Scaled image URL. */
  src: string;
  width: number;
  height: number;
  /** File description page on Commons (licence details). */
  pageUrl: string;
  /** Author as plain text; null when Commons does not name one. */
  artist: string | null;
  /** Short licence name, e.g. "CC BY-SA 4.0". */
  license: string;
  licenseUrl: string | null;
}

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const WIKI_API = 'https://en.wikipedia.org/w/api.php';
// v4: model photos skip podium shots and read infobox captions; older picks are dropped.
const STORAGE_PREFIX = 'racinghub:wm:v4:';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const imageClient = createClient({
  baseUrl: '',
  provider: 'Wikimedia',
  storage: null,
  minIntervalMs: 100,
  validate: (data) => {
    const result = data as { query?: unknown; parse?: unknown } | null;
    return result?.query || result?.parse ? null : 'Нет данных изображения';
  },
});

const memory = new Map<string, Promise<unknown>>();

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Memory + localStorage cache; failures are not cached, so a later visit tries again. */
function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = memory.get(key);
  if (hit) return hit as Promise<T>;
  const s = storage();
  try {
    const text = s?.getItem(STORAGE_PREFIX + key);
    if (text) {
      const saved = JSON.parse(text) as { at: number; value: T };
      if (Date.now() - saved.at < MAX_AGE_MS) {
        const p = Promise.resolve(saved.value);
        memory.set(key, p);
        return p;
      }
    }
  } catch {
    /* broken entry: load again */
  }
  const p = load().then(
    (value) => {
      try {
        s?.setItem(STORAGE_PREFIX + key, JSON.stringify({ at: Date.now(), value }));
      } catch {
        /* quota: the cache is optional */
      }
      return value;
    },
    (e: unknown) => {
      memory.delete(key);
      throw e;
    },
  );
  memory.set(key, p);
  return p;
}

async function getJson(base: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const url = new URL(base);
  for (const [k, v] of Object.entries({ ...params, format: 'json', formatversion: '2', origin: '*' })) {
    url.searchParams.set(k, v);
  }
  return (await imageClient.get(url.toString())).data as Record<string, unknown>;
}

/** "<a href=…>Lukas Raich</a>" → "Lukas Raich". */
export function plainText(html: string | undefined): string | null {
  if (!html) return null;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const text = (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
  return text || null;
}

/** Article title from a Wikipedia link, e.g. http://en.wikipedia.org/wiki/Max_Verstappen. */
export function wikiTitle(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!/(^|\.)wikipedia\.org$/.test(u.hostname) || !u.pathname.startsWith('/wiki/')) return null;
    const title = decodeURIComponent(u.pathname.slice('/wiki/'.length)).replace(/_/g, ' ');
    return title || null;
  } catch {
    return null;
  }
}

type Meta = Record<string, { value?: string } | undefined>;

const GRAPHIC =
  /\b(?:logos?|logotypes?|flags?|maps?|diagrams?|drawings?|illustrations?|signatures?|paintings?|renderings?)\b|coat of arms|(?:circuit|track)[ _-]*layout/i;
const RASTER = /\.(?:jpe?g|png|webp)$/i;
const PEOPLE = /\b(?:podium|drivers|portraits?|celebrat\w*|ceremony|trophy|presentation)\b/i;

function linkedPhotoFile(link: Element): string | null {
  const img = link.querySelector('img');
  if (!img || Math.max(Number(img.getAttribute('width')), Number(img.getAttribute('height'))) < 100)
    return null;
  try {
    const href = link.getAttribute('href')!;
    const url = new URL(href, WIKI_API);
    if (!/(^|\.)wikipedia\.org$/.test(url.hostname) && url.hostname !== 'commons.wikimedia.org') return null;
    const match = /(?:^|\/)File:(.+)$/i.exec(decodeURIComponent(url.pathname));
    const file = match?.[1].replace(/_/g, ' ');
    return file && RASTER.test(file) && !GRAPHIC.test(file) ? file : null;
  } catch {
    return null;
  }
}

/** Candidates belong to this article's infobox, never a search or another person's portrait. */
export function infoboxPhotoFiles(root: ParentNode): string[] {
  const files: string[] = [];
  for (const link of root.querySelectorAll('.infobox a[href]')) {
    const file = linkedPhotoFile(link);
    if (file && !files.includes(file)) files.push(file);
  }
  return files;
}

const words = (text: string): string[] => text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

/** Model numbers and variant names must appear in this image's caption, filename or section. */
function modelPhotoFiles(doc: Document, model: string, article: string): string[] {
  const base = new Set(words(article));
  const requested = words(model);
  const terms = requested.filter((word) => /\d/.test(word) || !base.has(word));
  if (!terms.length) terms.push(...requested);
  const headings = new Map<number, string>();
  const files: string[] = [];
  for (const el of doc.querySelectorAll('h2,h3,h4,h5,a[href]')) {
    if (/^H/.test(el.tagName)) {
      const level = Number(el.tagName.slice(1));
      for (const prior of headings.keys()) if (prior >= level) headings.delete(prior);
      headings.set(level, el.textContent ?? '');
      continue;
    }
    const file = linkedPhotoFile(el);
    if (!file) continue;
    // An infobox keeps its caption next to the <figure>, not inside it.
    const frame = el.closest('.infobox-image, .thumb') ?? el.closest('figure');
    const caption = `${file} ${frame?.textContent ?? ''}`;
    // A car photo, not the drivers on the podium holding the trophy.
    if (PEOPLE.test(caption)) continue;
    const context = new Set(words(`${caption} ${[...headings.values()].join(' ')}`));
    if ([...context].some((word) => /^evo(?:lution|\d+)?$/.test(word) && !requested.includes(word))) continue;
    if (terms.every((term) => context.has(term)) && !files.includes(file)) files.push(file);
  }
  return files;
}

/** A Commons file scaled to `width` px, or null if it is not on Commons. */
export function getCommonsPhoto(file: string, width = 640, photosOnly = false): Promise<CommonsPhoto | null> {
  const name = file.replace(/^File:/i, '').replace(/_/g, ' ');
  if (photosOnly && (!RASTER.test(name) || GRAPHIC.test(name))) return Promise.resolve(null);
  return cached(`file:${name}:${width}:${photosOnly}`, async () => {
    const data = await getJson(COMMONS_API, {
      action: 'query',
      titles: `File:${name}`,
      prop: 'imageinfo',
      iiprop: 'url|size|mime|mediatype|extmetadata',
      iiurlwidth: String(width),
      iiextmetadatafilter: 'Artist|LicenseShortName|LicenseUrl|NonFree|ImageDescription|Categories',
    });
    const page = ((data.query as { pages?: unknown[] } | undefined)?.pages ?? [])[0] as
      { missing?: boolean; imagerepository?: string; imageinfo?: Record<string, unknown>[] } | undefined;
    const info = page?.imageinfo?.[0];
    if (!page || page.missing || page.imagerepository !== 'local' || !info) return null;
    const meta = (info.extmetadata ?? {}) as Meta;
    const license = plainText(meta.LicenseShortName?.value);
    if (!license || meta.NonFree?.value === 'true') return null;
    if (photosOnly) {
      const description = plainText(meta.ImageDescription?.value) ?? '';
      const categories = plainText(meta.Categories?.value) ?? '';
      if (info.mediatype !== 'BITMAP' || !/^image\/(?:jpeg|png|webp)$/.test(String(info.mime))) return null;
      if (GRAPHIC.test(`${description} ${categories}`)) return null;
      // PNG/WebP can be logos; require Commons to identify photographic content.
      if (
        !/\.jpe?g$/i.test(name) &&
        !/\b(?:photographs?|photos?|portraits?)\b/i.test(`${description} ${categories}`)
      )
        return null;
    }
    const src = String(info.thumburl ?? info.url ?? '');
    if (!/^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(src)) return null;
    return {
      src,
      width: Number(info.thumbwidth ?? info.width) || width,
      height: Number(info.thumbheight ?? info.height) || width,
      pageUrl: String(info.descriptionurl ?? `https://commons.wikimedia.org/wiki/File:${name}`),
      artist: plainText(meta.Artist?.value),
      license,
      licenseUrl: meta.LicenseUrl?.value ?? null,
    };
  });
}

/**
 * The main image of a Wikipedia article, if it is a free photo on Commons.
 * `photosOnly` excludes graphics using the original file type and Commons metadata.
 */
export async function getArticlePhoto(
  title: string,
  opts: { width?: number; photosOnly?: boolean; files?: readonly string[]; model?: string } = {},
): Promise<CommonsPhoto | null> {
  if (opts.model) {
    const model = opts.model;
    const candidates = await cached(`model:${title}:${model}`, async () => {
      const data = await getJson(WIKI_API, { action: 'parse', page: title, redirects: '1', prop: 'text' });
      const html = (data.parse as { text?: string } | undefined)?.text ?? '';
      return modelPhotoFiles(new DOMParser().parseFromString(html, 'text/html'), model, title);
    });
    for (const file of candidates) {
      const photo = await getCommonsPhoto(file, opts.width, true);
      if (photo) return photo;
    }
    return null;
  }
  const tried = new Set<string>();
  const photoOf = async (file: string) => {
    if (tried.has(file)) return null;
    tried.add(file);
    return getCommonsPhoto(file, opts.width, opts.photosOnly);
  };
  for (const file of opts.files ?? []) {
    const photo = await photoOf(file);
    if (photo) return photo;
  }
  const file = await cached(`article:${title}`, async () => {
    const data = await getJson(WIKI_API, {
      action: 'query',
      titles: title,
      redirects: '1',
      prop: 'pageimages',
      piprop: 'name',
      pilicense: 'free',
    });
    const page = ((data.query as { pages?: unknown[] } | undefined)?.pages ?? [])[0] as
      { pageimage?: string } | undefined;
    return page?.pageimage ?? null;
  });
  if (file) {
    const photo = await photoOf(file);
    if (photo) return photo;
  }
  if (opts.files !== undefined) return null;
  const candidates = await cached(`infobox:${title}`, async () => {
    const data = await getJson(WIKI_API, { action: 'parse', page: title, redirects: '1', prop: 'text' });
    const html = (data.parse as { text?: string } | undefined)?.text ?? '';
    return infoboxPhotoFiles(new DOMParser().parseFromString(html, 'text/html'));
  });
  for (const candidate of candidates) {
    const photo = await photoOf(candidate);
    if (photo) return photo;
  }
  return null;
}
