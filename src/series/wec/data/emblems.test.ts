import { emblemOf } from './emblems';

const logoFiles = Object.keys(import.meta.glob('/public/logos/*')).map((p) => p.split('/').pop());

describe('emblemOf', () => {
  it('matches the manufacturer a name starts with, not customer teams', () => {
    expect(emblemOf('Toyota')?.file).toBe('toyota.png');
    expect(emblemOf('Toyota Gazoo Racing')?.file).toBe('toyota.png');
    expect(emblemOf('Mercedes-AMG Team Akkodis ASP')?.file).toBe('mercedes.svg');
    expect(emblemOf('Aston Martin THOR Team')?.file).toBe('aston_martin.png');
    expect(emblemOf('Chevrolet')?.file).toBe('corvette.png');
    expect(emblemOf('AF Corse')).toBeNull();
    expect(emblemOf('Toyotaville')).toBeNull();
  });

  it('every emblem has its file and a source', () => {
    const names = ['Toyota', 'Porsche', 'BMW', 'Peugeot', 'Lamborghini', 'Genesis', 'Ford', 'Corvette'];
    for (const name of [...names, 'Lexus', 'Nissan', 'Isotta Fraschini', 'Ferrari', 'Aston Martin']) {
      const entry = emblemOf(name)!;
      expect(logoFiles).toContain(entry.file);
      expect(entry.source).toMatch(/^https:\/\/(commons\.wikimedia|en\.wikipedia)\.org\/wiki\/File:/);
    }
  });
});
