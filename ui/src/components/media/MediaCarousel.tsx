import React, { useEffect, useRef, useState } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { MediaContent } from '../../types';

interface Props {
  items: MediaContent[];
  /** Auto-advance interval in ms. Default 5000. */
  interval?: number;
  /** Height of the carousel. Default 420. */
  height?: number | string;
  title?: string;
}

const VIDEO_EXT = /\.(mp4|mov|avi|webm|mkv|m4v)$/i;

const isVideo = (item: MediaContent) =>
  item.mediaType === 'VIDEO' || VIDEO_EXT.test(item.url);

export const MediaCarousel: React.FC<Props> = ({
  items,
  interval = 5000,
  height = 420,
  title,
}) => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [fade, setFade] = useState(true);
  // Changing resetKey restarts the auto-advance timer after a manual navigation
  const [resetKey, setResetKey] = useState(0);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset to first item when the item list changes
  useEffect(() => { setIndex(0); }, [items]);

  const goTo = (next: number) => {
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
    setFade(false);
    fadeTimer.current = setTimeout(() => {
      setIndex(next);
      setFade(true);
    }, 180);
    setResetKey(k => k + 1);
  };

  const prev = () => goTo((index - 1 + items.length) % items.length);
  const next = () => goTo((index + 1) % items.length);

  // Auto-advance
  useEffect(() => {
    if (paused || items.length <= 1) return;
    const id = setInterval(() => {
      setFade(false);
      fadeTimer.current = setTimeout(() => {
        setIndex(i => (i + 1) % items.length);
        setFade(true);
      }, 180);
    }, interval);
    return () => clearInterval(id);
  }, [paused, items.length, interval, resetKey]);

  useEffect(() => () => { if (fadeTimer.current) clearTimeout(fadeTimer.current); }, []);

  if (items.length === 0) return null;

  const item = items[index];
  const hasLabel = item.caption || item.matchLabel || item.teamName || item.playerName;

  return (
    <Box>
      <Box
        sx={{ position: 'relative', height, borderRadius: 2, overflow: 'hidden', bgcolor: '#0e1f0e' }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Media */}
        <Box
          sx={{
            width: '100%', height: '100%',
            opacity: fade ? 1 : 0,
            transition: 'opacity 0.18s ease-in-out',
          }}
        >
          {isVideo(item) ? (
            <Box
              key={item.url}
              component="video"
              src={item.url}
              autoPlay
              muted
              loop
              playsInline
              sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <Box
              component="img"
              src={item.url}
              alt={item.caption ?? ''}
              sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
            />
          )}
        </Box>

        {/* Bottom gradient overlay with label */}
        {hasLabel && (
          <Box
            sx={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'linear-gradient(transparent, rgba(0,0,0,0.72))',
              px: 2, pt: 4, pb: items.length > 1 ? 4 : 2,
              pointerEvents: 'none',
            }}
          >
            {item.caption && (
              <Typography variant="body2" sx={{ color: 'white', fontWeight: 500 }}>
                {item.caption}
              </Typography>
            )}
            {(item.matchLabel || item.teamName || item.playerName) && (
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }}>
                {[item.matchLabel, item.teamName, item.playerName].filter(Boolean).join(' · ')}
              </Typography>
            )}
          </Box>
        )}

        {/* Prev / Next arrows */}
        {items.length > 1 && (
          <>
            <IconButton
              onClick={prev}
              size="small"
              sx={{
                position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
                bgcolor: 'rgba(0,0,0,0.45)', color: 'white',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.65)' },
              }}
            >
              <ChevronLeft />
            </IconButton>
            <IconButton
              onClick={next}
              size="small"
              sx={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                bgcolor: 'rgba(0,0,0,0.45)', color: 'white',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.65)' },
              }}
            >
              <ChevronRight />
            </IconButton>
          </>
        )}

        {/* Dot indicators */}
        {items.length > 1 && (
          <Box
            sx={{
              position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
              display: 'flex', gap: 0.75, zIndex: 1,
            }}
          >
            {items.map((_, i) => (
              <Box
                key={i}
                onClick={() => goTo(i)}
                sx={{
                  width: i === index ? 20 : 8, height: 8, borderRadius: 4,
                  bgcolor: i === index ? 'white' : 'rgba(255,255,255,0.45)',
                  cursor: 'pointer', transition: 'all 0.25s',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.8)' },
                }}
              />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};
