import React from 'react';
import { Box, Typography, Button, SxProps, Theme } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  backTo?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  sx?: SxProps<Theme>;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, icon, backTo, onBack, actions, sx }) => {
  const navigate = useNavigate();
  const handleBack = onBack ?? (backTo ? () => navigate(backTo) : undefined);

  return (
    <Box sx={{ mb: 3, ...sx }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flexWrap: 'wrap' }}>
        {handleBack && (
          <Button
            startIcon={<ArrowBack />}
            size="small"
            onClick={handleBack}
            sx={{ flexShrink: 0, mt: 0.25 }}
          >
            Back
          </Button>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
          {icon && <Box sx={{ flexShrink: 0, display: 'flex', color: 'primary.main' }}>{icon}</Box>}
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="h5"
              sx={{ fontSize: { xs: '1.1rem', sm: '1.5rem' }, lineHeight: 1.25, wordBreak: 'break-word' }}
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
        {actions && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', flexShrink: 0 }}>
            {actions}
          </Box>
        )}
      </Box>
    </Box>
  );
};
