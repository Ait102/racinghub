import type { Named, StandingTable } from '../../../lib/wikiStandings';
import type { WikiFlag } from '../../../lib/wikitable';

export type FeNamed = Named;
export type { Named, StandingTable } from '../../../lib/wikiStandings';
export type { FeRaceData } from './race';

export interface FeRound {
  round: number;
  name: string;
  circuit: Named | null;
  country: WikiFlag | null;
  dateText: string;
  start: string | null;
  end: string | null;
  report: string | null;
  winner: Named | null;
  winningTeam: Named | null;
  pole: Named | null;
  fastestLap: Named | null;
  /** Race within a shared E-Prix article; null for a single race. */
  raceNumber: number | null;
}

export interface FeSeasonData {
  id: string;
  article: string;
  rounds: FeRound[];
  standings: StandingTable[];
  unavailable?: boolean;
}
