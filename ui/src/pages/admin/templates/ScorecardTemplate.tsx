import React from 'react';
import TemplateShell from './TemplateShell';
import ScorecardCardPreview from './ScorecardCardPreview';
import { TemplateProps } from './types';

/** Scorecard template — the Card Preview is the primary output.
 *  The plain-text view shows a simple tabular scorecard for copy/paste. */
const ScorecardTemplate: React.FC<TemplateProps> = (props) => {
  const { match, result, firstTeamName, secondTeamName, firstCard, secondCard, motmName, teamFilter } = props;
  const showFirst  = !teamFilter || teamFilter === 'both' || teamFilter === 'first';
  const showSecond = !teamFilter || teamFilter === 'both' || teamFilter === 'second';

  const generateText = (): string => {
    const lines: string[] = [];
    const col = (s: string, w: number) => s.padEnd(w).slice(0, w);

    if (result.forfeited || result.noResult) {
      lines.push(`${match.homeTeamName?.toUpperCase()} v ${match.oppositionTeamName?.toUpperCase()}`);
      if (match.matchDate) lines.push(String(match.matchDate));
      lines.push('');
      lines.push(result.forfeited ? 'MATCH FORFEITED' : 'NO RESULT — MATCH ABANDONED');
      if (result.matchOutcomeDescription) lines.push(result.matchOutcomeDescription);
      return lines.join('\n');
    }

    lines.push(`${match.homeTeamName?.toUpperCase()} v ${match.oppositionTeamName?.toUpperCase()}`);
    lines.push('');

    const renderInnings = (
      teamName: string,
      score: number | undefined,
      wkts: number | undefined,
      overs: string | undefined,
      batters: typeof firstCard.batting,
      bowlers: typeof firstCard.bowling,
    ) => {
      const scoreStr = score != null ? `${score}${wkts != null ? `/${wkts}` : ''} (${overs ?? '?'} ov)` : '';
      lines.push(`${teamName.toUpperCase()}  ${scoreStr}`);
      lines.push(`${'-'.repeat(60)}`);
      lines.push(`${col('BATTING', 22)}  ${col('', 12)}  ${col('BOWLING', 20)}  ${col('', 8)}`);

      const rows = Math.max((batters ?? []).length, (bowlers ?? []).length);
      for (let i = 0; i < rows; i++) {
        const bat  = (batters ?? [])[i];
        const bowl = (bowlers ?? [])[i];
        const batName = bat?.playerName ? `${bat.playerName}${bat.dismissed === false ? '*' : ''}` : '';
        const batStr  = batName
          ? `${col(batName, 22)}  ${col(bat.score != null ? `${bat.score}(${bat.ballsFaced ?? '?'})` : '', 12)}`
          : `${col('', 22)}  ${col('', 12)}`;
        const bowlStr = bowl?.playerName
          ? `${col(bowl.playerName, 20)}  ${bowl.wickets ?? 0}-${bowl.runs ?? 0}`
          : '';
        lines.push(`${batStr}  ${bowlStr}`);
      }
      lines.push('');
    };

    if (showFirst)  renderInnings(firstTeamName,  result.scoreBattingFirst,  result.wicketsLostBattingFirst,  result.oversBattingFirst,  firstCard.batting,  firstCard.bowling);
    if (showSecond) renderInnings(secondTeamName, result.scoreBattingSecond, result.wicketsLostBattingSecond, result.oversBattingSecond, secondCard.batting, secondCard.bowling);

    if (result.matchOutcomeDescription) lines.push(`RESULT: ${result.matchOutcomeDescription}`);
    if (result.matchDrawn)              lines.push('RESULT: Match Drawn');
    if (motmName)                       lines.push(`MAN OF THE MATCH: ${motmName}`);

    return lines.join('\n');
  };

  const [text, setText]           = React.useState(() => generateText());
  const [html, setHtml]           = React.useState('');
  const [editorKey, setEditorKey] = React.useState(0);

  const regenerate = () => {
    const t = generateText();
    setText(t);
    setHtml('');
    setEditorKey(k => k + 1);
  };

  return (
    <TemplateShell
      text={text}
      onTextChange={setText}
      html={html}
      onHtmlChange={setHtml}
      editorKey={editorKey}
      onRegenerate={regenerate}
      downloadPrefix={`scorecard-${match.matchId ?? 'match'}`}
      card={<ScorecardCardPreview {...props} />}
    />
  );
};

export default ScorecardTemplate;
