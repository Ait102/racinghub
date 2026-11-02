import type { Named, StandingTable } from '../../../lib/wikiStandings';
// WEC data model. Everything the source may leave out is nullable: missing data is
// shown as "—", never guessed. Points and positions are kept exactly as published.
import type { WikiFlag } from '../../../lib/wikitable';

export type {
  Named,
  ResultTone,
  ResultCell,
  StandingRound,
  StandingRow,
  StandingKind,
  StandingTable,
} from '../../../lib/wikiStandings';

export interface ClassWinner {
  /** Class as the source names it, e.g. "Hypercar", "LMGTE Am". */
  cls: string;
  number: string | null;
  team: Named | null;
  drivers: Named[];
}

export interface WecRound {
  round: number;
  name: string;
  /** Article about the event across years, for its winners history. */
  eventArticle: string | null;
  circuit: Named | null;
  location: string | null;
  country: WikiFlag | null;
  /** Date as written by the source, e.g. "13–14 June". */
  dateText: string;
  /** ISO dates (YYYY-MM-DD) when the text could be read; otherwise null. */
  start: string | null;
  end: string | null;
  /** Article about this year's race ("Report" link), if any. */
  report: string | null;
  winners: ClassWinner[];
}

export interface CancelledRace {
  name: string;
  circuit: Named | null;
  dateText: string;
}

export interface WecSeasonData {
  id: string;
  article: string;
  rounds: WecRound[];
  cancelled: CancelledRace[];
  /** Classes in the order the source lists their winners. */
  classes: string[];
  standings: StandingTable[];
}

export interface RaceEntry {
  pos: number | null;
  /** Position as published: "1", "DNF", "NC", "DSQ"… */
  posText: string;
  cls: string;
  number: string | null;
  team: Named | null;
  drivers: Named[];
  chassis: string | null;
  engine: string | null;
  tyre: string | null;
  laps: number | null;
  /** Total time, gap or reason for retiring. */
  time: string | null;
}

export interface QualifyingTable {
  /** Time columns as the source names them, e.g. "Lap", "Hyperpole 1". */
  timeColumns: string[];
  rows: Array<{
    pos: number | null;
    posText: string;
    cls: string | null;
    number: string | null;
    team: Named | null;
    driver: Named | null;
    times: string[];
    grid: string | null;
  }>;
}

export interface PracticeSession {
  title: string;
  rows: Array<{
    cls: string;
    number: string | null;
    team: Named | null;
    driver: Named | null;
    time: string | null;
  }>;
}

export interface WecRaceData {
  article: string;
  classification: RaceEntry[];
  qualifying: QualifyingTable | null;
  practice: PracticeSession[];
}
