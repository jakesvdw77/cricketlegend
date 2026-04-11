import { Match, MatchResult, Tournament, TeamScorecard } from '../../../types';

export interface TemplateProps {
  match: Match;
  result: MatchResult;
  tournament: Tournament | null;
  firstTeamName: string;
  secondTeamName: string;
  firstCard: TeamScorecard;
  secondCard: TeamScorecard;
  motmName: string | null;
}

export const plainTextToHtml = (text: string): string =>
  text
    .split('\n\n')
    .filter(Boolean)
    .map(para => `<p>${para.replace(/\n/g, '<br/>')}</p>`)
    .join('');
