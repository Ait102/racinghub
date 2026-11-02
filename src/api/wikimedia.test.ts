import { getArticlePhoto, getCommonsPhoto, infoboxPhotoFiles, plainText, wikiTitle } from './wikimedia';

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

const fileInfo = (over: Record<string, unknown> = {}, meta: Record<string, unknown> = {}) => ({
  query: {
    pages: [
      {
        imagerepository: 'local',
        imageinfo: [
          {
            thumburl: 'https://upload.wikimedia.org/x/600px-a.jpg',
            thumbwidth: 600,
            thumbheight: 400,
            mime: 'image/jpeg',
            mediatype: 'BITMAP',
            descriptionurl: 'https://commons.wikimedia.org/wiki/File:A.jpg',
            extmetadata: {
              Artist: { value: '<a href="x">Jane  Doe</a>' },
              LicenseShortName: { value: 'CC BY-SA 4.0' },
              LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0' },
              ...meta,
            },
            ...over,
          },
        ],
      },
    ],
  },
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('wikimedia helpers', () => {
  it('reads article titles only from Wikipedia links', () => {
    expect(wikiTitle('http://en.wikipedia.org/wiki/George_Russell_(racing_driver)')).toBe(
      'George Russell (racing driver)',
    );
    expect(wikiTitle('https://en.wikipedia.org/wiki/Kimi_R%C3%A4ikk%C3%B6nen')).toBe('Kimi Räikkönen');
    expect(wikiTitle('https://example.org/wiki/X')).toBeNull();
    expect(wikiTitle(null)).toBeNull();
    expect(wikiTitle('not a url')).toBeNull();
  });

  it('turns author HTML into plain text', () => {
    expect(plainText('<a href="x">Lukas  Raich</a>')).toBe('Lukas Raich');
    expect(plainText('')).toBeNull();
  });
});

describe('getCommonsPhoto', () => {
  it('recognizes graphic filenames written with MediaWiki underscores', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json(fileInfo())),
    );
    expect(await getCommonsPhoto('Raster_team_logo.jpg', 640, true)).toBeNull();
  });

  it('returns the scaled photo with its attribution', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json(fileInfo())),
    );
    const p = await getCommonsPhoto('A1.jpg', 600);
    expect(p).toEqual({
      src: 'https://upload.wikimedia.org/x/600px-a.jpg',
      width: 600,
      height: 400,
      pageUrl: 'https://commons.wikimedia.org/wiki/File:A.jpg',
      artist: 'Jane Doe',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    });
  });

  it('skips missing, non-free and foreign files', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ query: { pages: [{ missing: true }] } })),
    );
    expect(await getCommonsPhoto('A2.jpg')).toBeNull();

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json(fileInfo({}, { NonFree: { value: 'true' } }))),
    );
    expect(await getCommonsPhoto('A3.jpg')).toBeNull();

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json(fileInfo({ thumburl: 'https://evil.example/a.jpg' }))),
    );
    expect(await getCommonsPhoto('A4.jpg')).toBeNull();
  });

  it('caches the answer for the next visit', async () => {
    const f = vi.fn(async () => json(fileInfo()));
    vi.stubGlobal('fetch', f);
    await getCommonsPhoto('A5.jpg');
    await getCommonsPhoto('A5.jpg');
    expect(f).toHaveBeenCalledTimes(1);
  });
});

describe('getArticlePhoto', () => {
  it('retries a temporary rate limit instead of losing an available driver photo', async () => {
    let limited = false;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: RequestInfo | URL) => {
        if (!limited) {
          limited = true;
          return new Response('', { status: 429, headers: { 'Retry-After': '0' } });
        }
        return String(url).includes('en.wikipedia.org')
          ? json({ query: { pages: [{ pageimage: 'Rate limited driver.jpg' }] } })
          : json(fileInfo());
      }),
    );
    expect(await getArticlePhoto('Rate Limited Driver', { photosOnly: true, files: [] })).toMatchObject({
      license: 'CC BY-SA 4.0',
    });
  });

  it('selects the exact racing variant from its article section instead of a road car', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: RequestInfo | URL) => {
        const u = new URL(String(url));
        if (u.hostname === 'en.wikipedia.org')
          return json({
            parse: {
              text: '<table class="infobox"><tr><td><a href="/wiki/File:Ferrari_296_GTB.jpg"><img width="250" height="150"></a></td></tr></table><h3>296 GT3</h3><figure><a href="/wiki/File:Old_GT3.jpg"><img width="250" height="150"></a><figcaption>Ferrari 296 GT3</figcaption></figure><h3>296 GT3 Evo</h3><figure><a href="/wiki/File:Exact_race_variant.jpg"><img width="250" height="150"></a><figcaption>The No. 21 AF Corse 296 GT3 Evo at Spa.</figcaption></figure>',
            },
          });
        return u.searchParams.get('titles') === 'File:Exact race variant.jpg'
          ? json(fileInfo())
          : json({ query: { pages: [{ missing: true }] } });
      }),
    );
    expect(
      await getArticlePhoto('Ferrari 296', { photosOnly: true, model: 'Ferrari 296 GT3 Evo' }),
    ).toMatchObject({ license: 'CC BY-SA 4.0' });
  });

  it('takes the infobox car photo by its caption and never the drivers on the podium', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: RequestInfo | URL) => {
        const u = new URL(String(url));
        if (u.hostname === 'en.wikipedia.org')
          return json({
            parse: {
              text: '<table class="infobox"><tr><td class="infobox-image"><figure><a href="/wiki/File:2024_24_Hours_of_Le_Mans_(1).jpg"><img width="300" height="189"></a><figcaption></figcaption></figure><div class="infobox-caption">The No. 50 499P that took the overall victory</div></td></tr></table><figure><a href="/wiki/File:The_winning_Ferrari_499P_drivers_on_the_podium.jpg"><img width="250" height="150"></a><figcaption>Ferrari 499P drivers on the podium</figcaption></figure>',
            },
          });
        return u.searchParams.get('titles') === 'File:2024 24 Hours of Le Mans (1).jpg'
          ? json(fileInfo())
          : json({ query: { pages: [{ missing: true }] } });
      }),
    );
    expect(await getArticlePhoto('Ferrari 499P', { photosOnly: true, model: 'Ferrari 499P' })).toMatchObject({
      license: 'CC BY-SA 4.0',
    });
  });

  it('leaves an unpictured variant empty instead of substituting another generation', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: RequestInfo | URL) => {
        const u = new URL(String(url));
        if (u.hostname === 'commons.wikimedia.org') return json(fileInfo());
        if (u.searchParams.get('action') === 'query')
          return json({ query: { pages: [{ pageimage: 'Toyota TR010 Hybrid.jpg' }] } });
        return json({
          parse: {
            text: '<table class="infobox"><tr><td><a href="/wiki/File:Toyota_TR010_Hybrid.jpg"><img width="250" height="150"></a><div class="infobox-caption">Toyota TR010 Hybrid</div></td></tr></table>',
          },
        });
      }),
    );
    expect(
      await getArticlePhoto('Toyota GR010 Hybrid', { photosOnly: true, model: 'Toyota GR010 Hybrid' }),
    ).toBeNull();
  });

  it('does not substitute an Evo update for an unpictured original GT3 model', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: RequestInfo | URL) =>
        String(url).includes('commons.wikimedia.org')
          ? json(fileInfo())
          : json({
              parse: {
                text: '<h3>296 GT3 Evo</h3><figure><a href="/wiki/File:Ferrari_296_GT3_Evo.jpg"><img width="250" height="150"></a><figcaption>Ferrari 296 GT3 Evo</figcaption></figure>',
              },
            }),
      ),
    );
    expect(
      await getArticlePhoto('Ferrari 296 original model test', {
        photosOnly: true,
        model: 'Ferrari 296 GT3',
      }),
    ).toBeNull();
  });

  it('finds photographic infobox files without picking flags or unrelated article images', () => {
    const doc = new DOMParser().parseFromString(
      '<table class="infobox"><tr><td><a href="/wiki/File:Driver_portrait.png"><img width="220" height="300"></a><a href="/wiki/File:Flag.svg"><img width="23" height="15"></a></td></tr></table><a href="/wiki/File:Other_person.jpg"><img width="220" height="300"></a>',
      'text/html',
    );
    expect(infoboxPhotoFiles(doc)).toEqual(['Driver portrait.png']);
  });

  it('uses an attributed PNG photograph from the loaded article instead of a logo', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: RequestInfo | URL) => {
        const u = new URL(String(url));
        if (u.hostname === 'en.wikipedia.org') return json({ query: { pages: [{ pageimage: 'Logo.svg' }] } });
        return json(
          fileInfo(
            { mime: 'image/png' },
            { ImageDescription: { value: 'Photograph of the driver at Le Mans.' } },
          ),
        );
      }),
    );
    const photo = await getArticlePhoto('PNG Driver', {
      photosOnly: true,
      files: ['PNG Driver portrait.png'],
    });
    expect(photo?.license).toBe('CC BY-SA 4.0');
    expect(photo?.artist).toBe('Jane Doe');
  });

  it('falls back to an infobox photo when pageimages selects a logo', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: RequestInfo | URL) => {
        const u = new URL(String(url));
        if (u.hostname === 'commons.wikimedia.org') return json(fileInfo());
        if (u.searchParams.get('action') === 'parse')
          return json({
            parse: {
              text: '<table class="infobox"><tr><td><a href="/wiki/File:Fallback_portrait.jpg"><img width="200" height="300"></a></td></tr></table>',
            },
          });
        return json({ query: { pages: [{ pageimage: 'Fallback logo.svg' }] } });
      }),
    );
    expect(await getArticlePhoto('Fallback Driver', { photosOnly: true })).toMatchObject({
      license: 'CC BY-SA 4.0',
    });
  });

  it('rejects logos and drawings even when they are raster images', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: RequestInfo | URL) => {
        const u = new URL(String(url));
        if (u.hostname === 'commons.wikimedia.org')
          return json(fileInfo({}, { Categories: { value: 'Drawings of racing drivers|Portraits' } }));
        return json({ query: { pages: [{ pageimage: 'Illustrated driver.jpg' }] } });
      }),
    );
    expect(await getArticlePhoto('Drawn Driver', { photosOnly: true, files: [] })).toBeNull();
  });

  it('uses the article image and can keep photos only', async () => {
    const f = vi.fn(async (url: RequestInfo | URL) =>
      String(url).includes('en.wikipedia.org')
        ? json({
            query: { pages: [{ pageimage: String(url).includes('Logo') ? 'Team logo.svg' : 'Car.jpg' }] },
          })
        : json(fileInfo()),
    );
    vi.stubGlobal('fetch', f);
    expect(await getArticlePhoto('Some Car')).not.toBeNull();
    expect(await getArticlePhoto('Logo Team', { photosOnly: true })).toBeNull();
  });
});
