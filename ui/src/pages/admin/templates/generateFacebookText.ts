import { Match, MatchResult, Tournament, TeamScorecard } from '../../../types';
import { TeamFilter } from './types';

const battingHighlights = (card: TeamScorecard): string => {
  const batters = (card.batting ?? []).filter(b => b.playerName);
  if (!batters.length) return '';
  return batters.map(b => {
    const parts: string[] = [];
    if (b.score      != null) parts.push(`${b.score} run${b.score !== 1 ? 's' : ''}`);
    if (b.ballsFaced != null) parts.push(`off ${b.ballsFaced} ball${b.ballsFaced !== 1 ? 's' : ''}`);
    const boundaries: string[] = [];
    if (b.fours != null && b.fours > 0) boundaries.push(`${b.fours} four${b.fours !== 1 ? 's' : ''}`);
    if (b.sixes != null && b.sixes > 0) boundaries.push(`${b.sixes} six${b.sixes !== 1 ? 'es' : ''}`);
    if (boundaries.length) parts.push(`including ${boundaries.join(' and ')}`);
    return `${b.playerName} (${parts.join(', ')})`;
  }).join(', ');
};

const bowlingHighlights = (card: TeamScorecard): string => {
  const bowlers = (card.bowling ?? []).filter(b => b.playerName);
  if (!bowlers.length) return '';
  return bowlers.map(b => {
    const parts: string[] = [];
    if (b.wickets != null) parts.push(`${b.wickets}/${b.runs ?? '?'}`);
    if (b.overs)           parts.push(`in ${b.overs} overs`);
    if (b.maidens != null && b.maidens > 0) parts.push(`${b.maidens} maiden${b.maidens !== 1 ? 's' : ''}`);
    return `${b.playerName} (${parts.join(', ')})`;
  }).join(', ');
};

export const generateFacebookText = (
  match: Match,
  result: MatchResult,
  tournament: Tournament | null,
  firstTeamName: string,
  secondTeamName: string,
  firstCard: TeamScorecard,
  secondCard: TeamScorecard,
  motmName: string | null,
  teamFilter?: TeamFilter,
): string => {
  const showFirst  = !teamFilter || teamFilter === 'both' || teamFilter === 'first';
  const showSecond = !teamFilter || teamFilter === 'both' || teamFilter === 'second';

  const paras: string[] = [];

  // Headline
  paras.push(`🏏 Match Report: ${match.homeTeamName} vs ${match.oppositionTeamName}`);

  // Introduction
  const venueClause    = match.fieldName ? `at ${match.fieldName}` : '';
  const dateClause     = match.matchDate ? `on ${match.matchDate}` : '';
  const stageMap: Record<string, string> = { POOL: 'Pool Stage', SEMI_FINAL: 'Semi-Final', FINAL: 'Final' };
  let tournamentClause = '';
  if (tournament) {
    const stage = match.matchStage ? ` in the ${stageMap[match.matchStage] ?? match.matchStage}` : '';
    tournamentClause = `in the ${tournament.name}${stage}`;
    if (tournament.cricketFormat) tournamentClause += ` (${tournament.cricketFormat})`;
  } else if (match.tournamentName) {
    tournamentClause = `in the ${match.tournamentName}`;
  }
  const introFragments = [venueClause, dateClause, tournamentClause].filter(Boolean);
  const introSuffix    = introFragments.length ? ` ${introFragments.join(', ')}.` : '.';
  let intro = `${match.homeTeamName} faced off against ${match.oppositionTeamName}${introSuffix}`;
  if (match.umpire) intro += ` The match was officiated by ${match.umpire}.`;
  paras.push(intro);

  // Toss
  const tossTeam =
    match.tossWonBy === 'HOME'       ? match.homeTeamName :
    match.tossWonBy === 'OPPOSITION' ? match.oppositionTeamName : null;
  const tossDecision =
    match.tossDecision === 'BAT'  ? 'bat first' :
    match.tossDecision === 'BOWL' ? 'bowl first' : null;
  if (tossTeam && tossDecision) {
    paras.push(`🪙 ${tossTeam} won the toss and elected to ${tossDecision}, setting the stage for an exciting contest.`);
  }

  // 1st innings
  if (showFirst && result.scoreBattingFirst != null) {
    const score = `${result.scoreBattingFirst}/${result.wicketsLostBattingFirst ?? '?'}`;
    const overs = result.oversBattingFirst ? ` from their ${result.oversBattingFirst} overs` : '';
    let para = `🏏 Batting first, ${firstTeamName} posted a total of ${score}${overs}.`;
    const bats = battingHighlights(firstCard);
    if (bats) para += ` The batting was highlighted by fine contributions from ${bats}.`;
    paras.push(para);
    const bowls = bowlingHighlights(secondCard);
    if (bowls) paras.push(`🎯 With the ball, ${secondTeamName} were led by ${bowls}.`);
  }

  // 2nd innings
  if (showSecond && result.scoreBattingSecond != null) {
    const score  = `${result.scoreBattingSecond}/${result.wicketsLostBattingSecond ?? '?'}`;
    const overs  = result.oversBattingSecond ? ` from ${result.oversBattingSecond} overs` : '';
    const target = result.scoreBattingFirst != null
      ? ` chasing a target of ${result.scoreBattingFirst + 1},` : '';
    let para = `🏏 In reply,${target} ${secondTeamName} replied with ${score}${overs}.`;
    const bats = battingHighlights(secondCard);
    if (bats) para += ` Standout performances with the bat came from ${bats}.`;
    paras.push(para);
    const bowls = bowlingHighlights(firstCard);
    if (bowls) paras.push(`🎯 ${firstTeamName}'s bowling attack was led by ${bowls}.`);
  }

  // Result
  if (result.matchDrawn) {
    paras.push('⚖️ After a closely contested match, the two sides were unable to be separated and the game ended in a draw.');
  } else {
    const winnerName = result.winningTeamName;
    if (winnerName) {
      let resultPara = result.matchOutcomeDescription
        ? `🏆 ${result.matchOutcomeDescription}`
        : `🏆 ${winnerName} claimed victory in what was a fantastic display of cricket.`;
      if (result.decidedOnDLS)      resultPara += ' The result was determined by the DLS method.';
      if (result.wonWithBonusPoint) resultPara += ' The win came with a bonus point.';
      paras.push(resultPara);
    } else if (result.matchOutcomeDescription) {
      paras.push(`🏆 ${result.matchOutcomeDescription}`);
    }
  }

  // MOTM
  if (motmName) {
    paras.push(`🌟 A special mention goes to ${motmName}, who was named Man of the Match for an outstanding performance on the day.`);
  }

  // Closing
  paras.push('Well played to both teams — we look forward to seeing you all on the field again soon! 🙌');

  // Hashtags
  const tags = ['#Cricket', '#CricketLegend'];
  if (match.tournamentName)     tags.push(`#${match.tournamentName.replace(/\s+/g, '')}`);
  if (match.homeTeamName)       tags.push(`#${match.homeTeamName.replace(/\s+/g, '')}`);
  if (match.oppositionTeamName) tags.push(`#${match.oppositionTeamName.replace(/\s+/g, '')}`);
  paras.push(tags.join(' '));

  return paras.join('\n\n');
};
