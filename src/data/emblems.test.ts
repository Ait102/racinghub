// @vitest-environment node
import { emblemOf, teamEmblem } from './emblems';

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

  it('gives a customer team the make of its cars only when all of them agree', () => {
    expect(teamEmblem('The Bend Manthey', ['Porsche 911 GT3 R (992)'])?.file).toBe('porsche.png');
    expect(teamEmblem('Garage 59', ['McLaren 720S GT3 Evo'])?.file).toBe('mclaren.svg');
    expect(teamEmblem('TF Sport', ['Chevrolet Corvette Z06 GT3.R'])?.file).toBe('corvette.png');
    expect(teamEmblem('Toyota Racing', ['Oreca 07'])?.file).toBe('toyota.png');
    expect(teamEmblem('Proton Competition', ['Porsche 911 GT3 R (992)', 'Ford Mustang GT3'])).toBeNull();
    expect(teamEmblem('Inter Europol Competition', ['Oreca 07'])).toBeNull();
    expect(teamEmblem('Iron Lynx')).toBeNull();
  });

  it('covers Formula E makes by team name or powertrain', () => {
    expect(emblemOf('Jaguar TCS Racing')?.file).toBe('jaguar.png');
    expect(emblemOf('DS Penske')?.file).toBe('ds.png');
    expect(emblemOf('Citroën Racing')?.file).toBe('citroen.png');
    expect(emblemOf('Lola-Yamaha T001')?.file).toBe('lola.png');
    expect(teamEmblem('Andretti Formula E', ['Porsche 99X Electric'])?.file).toBe('porsche.png');
    expect(teamEmblem('Envision Racing', ['Jaguar I-Type 7'])?.file).toBe('jaguar.png');
    expect(teamEmblem('Cupra Kiro', ['Porsche 99X Electric WCG3'])?.file).toBe('porsche.png');
    // "Dsomething" or a name merely containing a make is not that make.
    expect(emblemOf('Dragon Racing')).toBeNull();
    for (const name of ['Jaguar', 'Mahindra', 'DS', 'Citroën', 'Maserati', 'Lola', 'NIO', 'Renault']) {
      expect(logoFiles).toContain(emblemOf(name)!.file);
    }
  });
});
