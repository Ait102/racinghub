import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FeCircuitPanel } from './FeCircuitPanel';

const monaco = { name: 'Circuit de Monaco', article: 'Circuit de Monaco', flag: null };

describe('FeCircuitPanel', () => {
  it('shows the confirmed full Monaco layout and credits its sources', async () => {
    render(<FeCircuitPanel season="2025-26" venue={monaco} circuit={null} article="2026 Monaco ePrix" />);

    expect(await screen.findByRole('img')).toHaveAccessibleName(
      /Circuit de Monaco: 19 поворотов, длина 3.337 км/,
    );
    expect(screen.getByRole('link', { name: 'F1DB' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Конфигурация Formula E' })).toHaveAttribute(
      'href',
      'https://www.fiaformulae.com/en/news/races/track-map-what-does-the-monaco-e-prix-circuit-look-like',
    );
  });

  it('keeps the race facts when the same venue used an unconfirmed layout', async () => {
    const { rerender } = render(
      <FeCircuitPanel season="2025-26" venue={monaco} circuit={null} article="2026 Monaco ePrix" />,
    );
    await screen.findByRole('img');
    rerender(
      <FeCircuitPanel
        season="2020-21"
        venue={monaco}
        circuit={{ location: 'Monte Carlo', course: 'Street Circuit', length: '3.320 km' }}
        description="The Formula E layout used a modified chicane."
        article="2021 Monaco ePrix"
      />,
    );

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText(/Подтверждённой схемы/)).toBeInTheDocument();
    expect(screen.getByText('3.320 km')).toBeInTheDocument();
    expect(screen.getByText(/modified chicane/)).toBeInTheDocument();
  });

  it('shows and credits the Formula E configuration at Tempelhof', async () => {
    render(
      <FeCircuitPanel
        season="2025-26"
        venue={{
          name: 'Tempelhof Airport Street Circuit',
          article: 'Tempelhof Airport Street Circuit',
          flag: null,
        }}
        circuit={null}
        article="2026 Berlin ePrix"
      />,
    );

    expect(await screen.findByRole('img')).toHaveAccessibleName(/15 поворотов, длина 2.374 км/);
    expect(screen.getByRole('link', { name: /Nasho3498/ })).toHaveAttribute(
      'href',
      'https://commons.wikimedia.org/wiki/File:Tempelhof_FE_2026.png',
    );
    expect(screen.getByRole('link', { name: 'CC BY-SA 4.0' })).toBeInTheDocument();
  });
});
