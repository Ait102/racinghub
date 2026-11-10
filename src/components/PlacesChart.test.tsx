import { act, fireEvent, render, screen } from '@testing-library/react';

import type { PlaceSeries } from '../lib/places';
import { PlacesChart } from './PlacesChart';

const series: PlaceSeries[] = [
  {
    id: 'car',
    label: 'Toyota · машина 1',
    places: [1, null, 3],
    texts: ['1', 'Ret', '3'],
  },
];

describe('PlacesChart', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('allows a tap to select a round and retains its source result after the finger leaves', () => {
    vi.stubGlobal(
      'PointerEvent',
      class extends MouseEvent {
        pointerType: string;
        constructor(type: string, init: PointerEventInit = {}) {
          super(type, init);
          this.pointerType = init.pointerType ?? '';
        }
      },
    );
    render(<PlacesChart rounds={['SPA', 'LMS', 'FUJ']} series={series} />);
    const chart = screen.getByRole('img');
    vi.spyOn(chart, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      width: 800,
    } as DOMRect);

    fireEvent.pointerDown(chart, { clientX: 410, pointerType: 'touch' });
    expect(screen.getByRole('status')).toHaveTextContent('LMS');
    expect(screen.getByRole('status')).toHaveTextContent('Ret');
    fireEvent.pointerLeave(chart, { pointerType: 'touch' });
    expect(screen.getByRole('status')).toHaveTextContent('Ret');
  });

  it('supports bounded keyboard navigation, Home, End and dismissal without losing retirements', () => {
    render(<PlacesChart rounds={['SPA', 'LMS', 'FUJ']} series={series} />);
    const chart = screen.getByRole('img');

    fireEvent.keyDown(chart, { key: 'End' });
    expect(screen.getByRole('status')).toHaveTextContent('FUJ');
    fireEvent.keyDown(chart, { key: 'ArrowRight' });
    expect(screen.getByRole('status')).toHaveTextContent('FUJ');
    fireEvent.keyDown(chart, { key: 'ArrowLeft' });
    expect(screen.getByRole('status')).toHaveTextContent('Ret');
    fireEvent.keyDown(chart, { key: 'Home' });
    expect(screen.getByRole('status')).toHaveTextContent('SPA');
    fireEvent.keyDown(chart, { key: 'Escape' });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('keeps results available when the pointer moves from the plot into the detail panel', () => {
    render(<PlacesChart rounds={['SPA', 'LMS', 'FUJ']} series={series} />);
    const chart = screen.getByRole('img');
    fireEvent.keyDown(chart, { key: 'ArrowRight' });
    fireEvent.pointerLeave(chart);

    expect(screen.getByRole('status')).toHaveTextContent('SPA');
  });

  it('keeps the active round inside the new range when a shorter table replaces the chart', () => {
    const { rerender } = render(<PlacesChart rounds={['SPA', 'LMS', 'FUJ']} series={series} />);
    fireEvent.keyDown(screen.getByRole('img'), { key: 'ArrowLeft' });
    rerender(<PlacesChart rounds={['SPA']} series={[{ ...series[0], places: [1], texts: ['1'] }]} />);

    expect(screen.getByRole('status')).toHaveTextContent('SPA');
    expect(screen.getByRole('status')).toHaveTextContent('1');
    expect(screen.getByRole('status')).not.toHaveTextContent('undefined');
  });

  it('bridges a retirement with a dashed line and marks it in the retirement row, never as a place', () => {
    const { container } = render(<PlacesChart rounds={['SPA', 'LMS', 'FUJ']} series={series} />);
    // The solid line itself stops at the retirement…
    expect(container.querySelector('g[data-series] path')).toHaveAttribute('d', 'M44.0,16.0M784.0,336.0');
    expect(container.querySelectorAll('circle')).toHaveLength(2);
    // …a faint dashed bridge joins the known places, and the "Ret" is a cross in the "сход" row.
    const bridge = container.querySelector('g[data-series] line[stroke-dasharray="3 5"]');
    expect(bridge).toHaveAttribute('x1', '44');
    expect(bridge).toHaveAttribute('x2', '784');
    expect(screen.getByText('сход')).toBeInTheDocument();
    expect(container.querySelector('g[data-series] path title')).toHaveTextContent('Toyota · машина 1: Ret');
  });

  it('brings the highlighted series forward and fades the others', () => {
    const two: PlaceSeries[] = [
      ...series,
      { id: 'other', label: 'Ferrari', places: [2, 2, 2], texts: ['2', '2', '2'] },
    ];
    const { container } = render(<PlacesChart rounds={['SPA', 'LMS', 'FUJ']} series={two} highlight="car" />);
    const groups = [...container.querySelectorAll('g[data-series]')];
    expect(groups.at(-1)).toHaveAttribute('data-series', 'car');
    expect(groups.find((g) => g.getAttribute('data-series') === 'other')).toHaveAttribute('opacity', '0.15');
  });

  it('shows the worst finishing place without crowding the vertical scale on a phone', () => {
    let resize: ResizeObserverCallback;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          resize = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    const { container } = render(
      <PlacesChart
        rounds={['LMS']}
        series={[
          {
            id: 'car',
            label: 'Toyota',
            places: [60],
            texts: ['60'],
          },
        ]}
      />,
    );
    act(() => resize([{ contentRect: { width: 260 } } as ResizeObserverEntry], {} as ResizeObserver));

    const ticks = [...container.querySelectorAll('text[dominant-baseline="middle"]')];
    expect(ticks.map((tick) => tick.textContent)).toContain('60');
    expect(ticks.length).toBeLessThanOrEqual(10);
  });

  it('keeps the measured mobile width and separates crowded round labels', () => {
    let resize: ResizeObserverCallback;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          resize = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    const rounds = Array.from({ length: 8 }, (_, i) => `BAHRAIN ${i + 1}`);
    const { container } = render(<PlacesChart rounds={rounds} series={[]} />);
    act(() => resize([{ contentRect: { width: 260 } } as ResizeObserverEntry], {} as ResizeObserver));

    expect(screen.getByRole('img').getAttribute('viewBox')?.split(' ')[2]).toBe('260');
    const labels = [...container.querySelectorAll('text')].filter((label) =>
      rounds.includes(label.querySelector('title')?.textContent ?? ''),
    );
    expect(labels).toHaveLength(8);
    expect(labels.every((label) => label.hasAttribute('transform'))).toBe(true);
  });
});
