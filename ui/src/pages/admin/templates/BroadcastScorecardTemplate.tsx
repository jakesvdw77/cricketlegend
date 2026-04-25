import React from 'react';
import TemplateShell from './TemplateShell';
import BroadcastScorecardPreview from './BroadcastScorecardPreview';
import { TemplateProps } from './types';

const BroadcastScorecardTemplate: React.FC<TemplateProps> = (props) => {
  const { match, result, firstTeamName, secondTeamName, firstCard, secondCard, motmName, teamFilter } = props;
  const showFirst  = !teamFilter || teamFilter === 'both' || teamFilter === 'first';
  const showSecond = !teamFilter || teamFilter === 'both' || teamFilter === 'second';

  const generateText = (): string => {
    const lines: string[] = [];
    const col = (s: string, w: number) => s.padEnd(w).slice(0, w);

    if (result.forfeited) {
      lines.push(`${match.homeTeamName?.toUpperCase()} vs ${match.oppositionTeamName?.toUpperCase()}`);
      if (match.matchDate) lines.push(String(match.matchDate));
      lines.push('');
      lines.push('MATCH FORFEITED');
      if (result.matchOutcomeDescription) lines.push(result.matchOutcomeDescription);
      return lines.join('\n');
    }

    lines.push(`${match.homeTeamName?.toUpperCase()} vs ${match.oppositionTeamName?.toUpperCase()}`);
    lines.push('MATCH SUMMARY');
    lines.push('');

    const innings = (
      teamName: string,
      score: number | undefined,
      wkts: number | undefined,
      overs: string | undefined,
      batters: typeof firstCard.batting,
      bowlers: typeof firstCard.bowling,
    ) => {
      const scoreStr = score != null ? `${score}${wkts != null ? `-${wkts}` : ''}` : '';
      lines.push(`${col(teamName.toUpperCase(), 30)}  ${overs ? overs + ' OVERS' : ''}  ${scoreStr}`);
      lines.push(`${col('BATSMAN', 24)}  ${col('R(B)', 8)}  ${col('BOWLER', 24)}  W-R`);
      lines.push('-'.repeat(68));
      const rows = Math.max((batters ?? []).length, (bowlers ?? []).length);
      for (let i = 0; i < rows; i++) {
        const bat  = (batters ?? [])[i];
        const bowl = (bowlers ?? [])[i];
        const batStr  = bat?.playerName  ? `${col(bat.playerName.toUpperCase(), 24)}  ${col(`${bat.score ?? ''}${bat.ballsFaced != null ? `(${bat.ballsFaced})` : ''}`, 8)}` : `${col('', 34)}`;
        const bowlStr = bowl?.playerName ? `${col(bowl.playerName.toUpperCase(), 24)}  ${bowl.wickets ?? 0}-${bowl.runs ?? 0}` : '';
        lines.push(`${batStr}  ${bowlStr}`);
      }
      lines.push('');
    };

    if (showFirst)  innings(firstTeamName,  result.scoreBattingFirst,  result.wicketsLostBattingFirst,  result.oversBattingFirst,  firstCard.batting,  firstCard.bowling);
    if (showSecond) innings(secondTeamName, result.scoreBattingSecond, result.wicketsLostBattingSecond, result.oversBattingSecond, secondCard.batting, secondCard.bowling);

    if (result.matchDrawn)                lines.push('MATCH DRAWN');
    else if (result.matchOutcomeDescription) lines.push(result.matchOutcomeDescription.toUpperCase());
    if (motmName) lines.push(`MAN OF THE MATCH: ${motmName}`);

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
      downloadPrefix={`broadcast-scorecard-${match.matchId ?? 'match'}`}
      card={<BroadcastScorecardPreview {...props} />}
    />
  );
};

export default BroadcastScorecardTemplate;
