import React, { useEffect, useState } from 'react';
import TemplateShell from './TemplateShell';
import FacebookCardPreview from './FacebookCardPreview';
import { TemplateProps, plainTextToHtml } from './types';
import { generateFacebookText } from './generateFacebookText';

const FacebookTemplate: React.FC<TemplateProps> = (props) => {
  const { match, result, tournament, firstTeamName, secondTeamName, firstCard, secondCard, motmName, teamFilter } = props;

  const [text, setText]           = useState('');
  const [html, setHtml]           = useState('');
  const [editorKey, setEditorKey] = useState(0);

  const generate = () => {
    const generated = generateFacebookText(
      match, result, tournament,
      firstTeamName, secondTeamName,
      firstCard, secondCard,
      motmName, teamFilter,
    );
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
      downloadPrefix={`facebook-match-${match.matchId ?? 'report'}`}
      card={<FacebookCardPreview text={text} match={match} tournament={tournament} />}
    />
  );
};

export default FacebookTemplate;
