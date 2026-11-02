import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { loadWecCircuit } from '../data/circuits';
import { WecCircuitPanel } from './WecCircuitPanel';

describe('WecCircuitPanel', () => {
  it('reuses the common outline and shows sourced track information', async () => {
    const { container } = render(<WecCircuitPanel article="6 Hours of Fuji" name="Фудзи" season="2026" />);
    expect(await screen.findByRole('img')).toHaveAccessibleName(/Фудзи: 16 поворотов, длина 4.563 км/);
    expect(container.querySelector('path')).toHaveAttribute(
      'd',
      (await loadWecCircuit('Fuji Speedway', '2026'))!.d,
    );
    expect(screen.getByText(/восточного подножия горы Фудзи/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Википедия' })).toHaveAttribute(
      'href',
      'https://en.wikipedia.org/wiki/Fuji_Speedway',
    );
    expect(screen.getByText(/проверено 02.11.2026/)).toBeInTheDocument();
  });

  it('credits the licensed WEC-only outline', async () => {
    render(<WecCircuitPanel article="Circuit de la Sarthe" season="2026" />);
    expect(await screen.findByRole('img')).toHaveAccessibleName(/38 поворотов, длина 13.626 км/);
    expect(screen.getByRole('link', { name: 'ODbL' })).toHaveAttribute(
      'href',
      'https://opendatacommons.org/licenses/odbl/1-0/',
    );
    expect(screen.getByRole('link', { name: /OpenStreetMap contributors/ })).toBeInTheDocument();
  });

  it('keeps the description and explains missing historical geometry', async () => {
    render(<WecCircuitPanel article="24 Hours of Le Mans" season="2012" />);
    expect(await screen.findByText('Подтверждённой схемы для сезона 2012 пока нет.')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText(/дороги общего пользования/)).toBeInTheDocument();
  });

  it('never leaves the previous map visible when article or season changes', async () => {
    const { rerender } = render(<WecCircuitPanel article="Circuit de la Sarthe" season="2026" />);
    await screen.findByRole('img');
    rerender(<WecCircuitPanel article="Circuit de la Sarthe" season="2012" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    await screen.findByText('Подтверждённой схемы для сезона 2012 пока нет.');
    rerender(<WecCircuitPanel article="Unknown track" season="2026" />);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});
