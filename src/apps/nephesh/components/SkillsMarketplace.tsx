'use client';

/**
 * SkillsMarketplace - Browse and install skills (Phase 2)
 */

import * as React from 'react';
import { Box, Typography } from '@mui/joy';


export function SkillsMarketplace() {
  return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography level='h4' sx={{ mb: 2 }}>Skills Marketplace</Typography>
      <Typography level='body-lg' sx={{ color: 'text.tertiary' }}>
        Coming in Phase 2: Browse and install markdown-based skills for your agents
      </Typography>
    </Box>
  );
}
