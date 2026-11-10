import { fireEvent, render, screen, within } from '@testing-library/react';

import { ChampionshipChart } from './ChampionshipChart';

it('shows official negative and zero totals, and leaves unpublished rounds empty', () => {
  render(
    <ChampionshipChart
      rounds={[
        { label: '1', title: 'First round' },
        { label: '2', title: 'Second round' },
        { label: '3', title: 'Third round' },
      ]}
      series={[
        { id: 'a', label: 'First team', shortLabel: 'AAA', points: [-3, null, 0], color: '#fff' },
        { id: 'b', label: 'Second team', shortLabel: 'BBB', points: [0, 4, 12], color: '#aaa' },
      ]}
    />,
  );

  const plot = screen.getByRole('img', { name: /График очков/ });
  fireEvent.keyDown(plot, { key: 'Home' });
  expect(within(screen.getByRole('status')).getByText('-3')).toBeVisible();
  expect(within(screen.getByRole('status')).getByText('0')).toBeVisible();
  fireEvent.keyDown(plot, { key: 'ArrowRight' });
  expect(screen.getByRole('status')).not.toHaveTextContent('AAA');
  fireEvent.keyDown(plot, { key: 'End' });
  expect(screen.getByRole('status')).toHaveTextContent('Third round');
  expect(within(screen.getByRole('status')).getByText('0')).toBeVisible();
});
