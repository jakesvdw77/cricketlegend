import React from 'react';
import { Box } from '@mui/material';

interface Props {
  url: string;
  label?: string;
}

const FACEBOOK_HOST = /^https?:\/\/(www\.)?facebook\.com/i;

// Facebook blocks direct iframe embedding. Their Page Plugin endpoint is the only supported way.
function resolveEmbedSrc(url: string): string {
  if (FACEBOOK_HOST.test(url)) {
    return `https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(url)}&tabs=timeline&width=500&height=600&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true`;
  }
  return url;
}

export const SocialMediaPageEmbed: React.FC<Props> = ({ url, label }) => (
  <Box sx={{ overflow: 'hidden', borderRadius: 2, maxWidth: '100%' }}>
    <iframe
      src={resolveEmbedSrc(url)}
      width="500"
      height="600"
      style={{ border: 'none', overflow: 'hidden', display: 'block', maxWidth: '100%' }}
      scrolling="no"
      frameBorder={0}
      allowFullScreen
      allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
      title={label ?? 'Social Media Page'}
    />
  </Box>
);
