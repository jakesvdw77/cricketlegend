import { Match, MatchResult, Tournament, TeamScorecard, BattingEntry, BowlingEntry } from '../../../types';

/** Returns only top-performer entries if any are marked; otherwise returns all with a name. */
export const topBatters  = (card: TeamScorecard): BattingEntry[] => {
  const named = (card.batting ?? []).filter(b => b.playerName);
  const top   = named.filter(b => b.topPerformer);
  return top.length ? top : named;
};

export const topBowlers = (card: TeamScorecard): BowlingEntry[] => {
  const named = (card.bowling ?? []).filter(b => b.playerName);
  const top   = named.filter(b => b.topPerformer);
  return top.length ? top : named;
};

export type TeamFilter = 'both' | 'first' | 'second';

export interface TemplateProps {
  match: Match;
  result: MatchResult;
  tournament: Tournament | null;
  firstTeamName: string;
  secondTeamName: string;
  firstCard: TeamScorecard;
  secondCard: TeamScorecard;
  motmName: string | null;
  teamFilter?: TeamFilter;
}

export const plainTextToHtml = (text: string): string =>
  text
    .split('\n\n')
    .filter(Boolean)
    .map(para => `<p>${para.replace(/\n/g, '<br/>')}</p>`)
    .join('');
