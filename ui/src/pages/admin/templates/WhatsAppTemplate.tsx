import React, { useEffect, useState } from 'react';
import TemplateShell from './TemplateShell';
import MatchCardPreview from './MatchCardPreview';
import { TemplateProps, plainTextToHtml } from './types';

const WhatsAppTemplate: React.FC<TemplateProps> = (props) => {
  const { match, result, tournament, firstTeamName, secondTeamName, firstCard, secondCard, motmName, teamFilter } = props;
  const showFirst  = !teamFilter || teamFilter === 'both' || teamFilter === 'first';
  const showSecond = !teamFilter || teamFilter === 'both' || teamFilter === 'second';

  const [text, setText]         = useState('');
  const [html, setHtml]         = useState('');
  const [editorKey, setEditorKey] = useState(0);

  const generate = () => {
    const DIV  = '━'.repeat(50);
    const THIN = '─'.repeat(50);
    const lines: string[] = [];
    const add = (s = '') => lines.push(s);

    if (result.forfeited || result.noResult) {
      add(DIV);
      add('🏏  MATCH RESULT');
      add(DIV);
      add();
      add(`${match.homeTeamName ?? '?'}  vs  ${match.oppositionTeamName ?? '?'}`);
      if (match.matchDate) add(`📅 ${match.matchDate}`);
      if (match.fieldName) add(`📍 ${match.fieldName}`);
      add();
      add(result.forfeited ? '⚠️  Match Forfeited' : '🚫  No Result — Match Abandoned');
      if (result.matchOutcomeDescription) { add(); add(result.matchOutcomeDescription); }
      add(); add(DIV);
      const generated = lines.join('\n');
      setText(generated);
      setHtml(plainTextToHtml(generated));
      setEditorKey(k => k + 1);
      return;
    }

    // Header
    add(DIV);
    add('🏏  MATCH SUMMARY');
    add(DIV);
    add();
    add(`${match.homeTeamName ?? '?'}  vs  ${match.oppositionTeamName ?? '?'}`);
    const meta = [
      match.matchDate      && `📅 ${match.matchDate}`,
      match.fieldName      && `📍 ${match.fieldName}`,
      match.tournamentName && `🏆 ${match.tournamentName}`,
    ].filter(Boolean).join('   ');
    if (meta)         add(meta);
    if (match.umpire) add(`🧑‍⚖️ Umpire: ${match.umpire}`);

    // Tournament
    if (tournament) {
      add();
      add(DIV);
      add('🏆  TOURNAMENT');
      add(DIV);
      add(tournament.name);
      [
        tournament.cricketFormat    && `Format: ${tournament.cricketFormat}`,
        tournament.ageGroup         && `Age Group: ${tournament.ageGroup.replace(/_/g, ' ')}`,
        tournament.tournamentGender && `Category: ${tournament.tournamentGender}`,
      ].filter(Boolean).forEach(d => add(d as string));
      const stageMap: Record<string, string> = { FRIENDLY: 'Friendly', POOL: 'Pool Stage', QUARTER_FINAL: 'Quarter-Final', SEMI_FINAL: 'Semi-Final', FINAL: 'Final' };
      if (match.matchStage) add(`Stage: ${stageMap[match.matchStage] ?? match.matchStage}`);
      const dates = [
        tournament.startDate && `From: ${tournament.startDate}`,
        tournament.endDate   && `To:   ${tournament.endDate}`,
      ].filter(Boolean);
      if (dates.length) { add(); dates.forEach(d => add(d as string)); }
    }

    // Toss
    const tossTeam =
      match.tossWonBy === 'HOME'       ? match.homeTeamName :
      match.tossWonBy === 'OPPOSITION' ? match.oppositionTeamName : null;
    const tossDecision =
      match.tossDecision === 'BAT'  ? 'bat first' :
      match.tossDecision === 'BOWL' ? 'bowl first' : null;
    if (tossTeam || tossDecision) {
      add();
      add(DIV);
      add('🪙  TOSS');
      add(DIV);
      if (tossTeam && tossDecision) add(`${tossTeam} won the toss and elected to ${tossDecision}.`);
      else if (tossTeam)            add(`${tossTeam} won the toss.`);
    }

    // Scorecard
    add();
    add(DIV);
    add('📊  SCORECARD');
    add(DIV);

    const inningsBlock = (
      heading: string,
      score?: number, wkts?: number, overs?: string,
      batCard = firstCard, bowlCard = secondCard,
    ) => {
      add();
      add(heading);
      if (score != null) add(`${score}/${wkts ?? '?'}  (${overs ?? '?'} overs)`);
      const batting = (batCard.batting ?? []).filter(b => b.playerName);
      if (batting.length) {
        add();
        add('  🏏 Batting');
        batting.forEach(b => {
          const sr = (b.score != null && b.ballsFaced != null && b.ballsFaced > 0)
            ? Math.round(b.score / b.ballsFaced * 100) : null;
          const stats = [
            b.score      != null && `${b.score} runs`,
            b.ballsFaced != null && `${b.ballsFaced} balls`,
            b.fours      != null && `${b.fours} fours`,
            b.sixes      != null && `${b.sixes} sixes`,
            sr != null && sr >= 100 && `SR: ${sr}`,
          ].filter(Boolean).join(' | ');
          add(`  • ${b.playerName}${stats ? `  —  ${stats}` : ''}`);
        });
      }
      const bowling = (bowlCard.bowling ?? []).filter(b => b.playerName);
      if (bowling.length) {
        add();
        add('  🎯 Bowling');
        bowling.forEach(b => {
          const stats = [
            b.overs           && `${b.overs} ov`,
            b.maidens != null && `${b.maidens}m`,
            b.runs    != null && `${b.runs}r`,
            b.wickets != null && `${b.wickets}w`,
          ].filter(Boolean).join('  ');
          add(`  • ${b.playerName}${stats ? `  —  ${stats}` : ''}`);
        });
      }
    };

    if (showFirst)  inningsBlock(`1ST INNINGS — ${firstTeamName}`, result.scoreBattingFirst,  result.wicketsLostBattingFirst,  result.oversBattingFirst,  firstCard,  secondCard);
    if (showFirst && showSecond) { add(); add(THIN); }
    if (showSecond) inningsBlock(`2ND INNINGS — ${secondTeamName}`, result.scoreBattingSecond, result.wicketsLostBattingSecond, result.oversBattingSecond, secondCard, firstCard);

    // Result
    add(); add(DIV); add('🏆  RESULT'); add(DIV);
    if (!result.matchCompleted) {
      add('❌ Match Abandoned');
    } else if (result.matchDrawn) {
      add('🤝 Match Drawn');
    } else {
      const winner = result.winningTeamName;
      if (winner) add(`🥇 Winner: ${winner}`);
      if (result.decidedBySuperOver)  add('⚡ Decided by Super Over');
      else if (result.decidedOnDLS)   add('🌧️ Decided by DLS method');
      if (result.wonWithBonusPoint)   add('⭐ Won with Bonus Point');
    }
    if (result.matchOutcomeDescription) { add(); add(result.matchOutcomeDescription); }
    if (motmName && result.matchCompleted) { add(); add(`🌟 Man of the Match: ${motmName}`); }
    add(); add(DIV);

    const generated = lines.join('\n');
    setText(generated);
    setHtml(plainTextToHtml(generated));
    setEditorKey(k => k + 1);
  };

  // Auto-generate on first mount
  useEffect(() => { generate(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <TemplateShell
      text={text}
      onTextChange={setText}
      html={html}
      onHtmlChange={setHtml}
      editorKey={editorKey}
      onRegenerate={generate}
      downloadPrefix={`whatsapp-match-${match.matchId ?? 'report'}`}
      card={<MatchCardPreview {...props} />}
    />
  );
};

export default WhatsAppTemplate;
