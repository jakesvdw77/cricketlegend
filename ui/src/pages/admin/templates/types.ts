import { Match, MatchResult, Tournament, TeamScorecard } from '../../../types';

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
