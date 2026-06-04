import React, { useState } from 'react';
import { Box, IconButton, Popover, Tooltip } from '@mui/material';
import { EmojiEmotions } from '@mui/icons-material';

export const EMOJIS = [
  // Cricket
  '🏏','🔴','⚪','🏟️','🧤','🧢','🎽','👟','🏃','💪',
  '⚡','🌱','☀️','🌧️','⛅','🌤️','📋','📊','✏️','🎯',
  '🏆','🥇','🥈','🥉','🏅','🎖️','💯','🔥','⭐','🌟',
  // Faces
  '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊',
  '😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋',
  '😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐',
  '😐','😑','😶','😏','😒','🙄','😬','🤥','😔','😪',
  '🤤','😴','😷','🤒','🤕','🤢','🤮','🥵','🥶','😱',
  '😨','😰','😥','😓','🤯','😤','😠','😡','🤬','💀',
  // Gestures
  '👍','👎','👏','🙌','🤝','🙏','✌️','🤞','👌','🤙',
  // Hearts
  '❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','❤️‍🔥',
  // Celebration
  '🎉','🎊','✨','🎈','🎁','🥂','🍾','🎶','🎵','🎤',
];

interface Props {
  onSelect: (emoji: string) => void;
}

export const EmojiPickerButton: React.FC<Props> = ({ onSelect }) => {
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);

  return (
    <>
      <Tooltip title="Insert Emoji">
        <IconButton size="small" onClick={e => setAnchor(e.currentTarget)} sx={{ borderRadius: 1, p: 0.5 }}>
          <EmojiEmotions fontSize="small" />
        </IconButton>
      </Tooltip>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <Box sx={{ p: 1, width: 300, display: 'flex', flexWrap: 'wrap', gap: 0.25 }}>
          {EMOJIS.map(emoji => (
            <IconButton
              key={emoji}
              size="small"
              onClick={() => { onSelect(emoji); setAnchor(null); }}
              sx={{ fontSize: 18, p: 0.5, borderRadius: 1, minWidth: 32 }}
            >
              {emoji}
            </IconButton>
          ))}
        </Box>
      </Popover>
    </>
  );
};
