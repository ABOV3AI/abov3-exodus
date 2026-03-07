'use client';

/**
 * MemoryBrowser - Browse and search agent memories (Phase 4)
 */

import * as React from 'react';
import { Box, Typography } from '@mui/joy';


export function MemoryBrowser() {
  return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography level='h4' sx={{ mb: 2 }}>Memory Browser</Typography>
      <Typography level='body-lg' sx={{ color: 'text.tertiary' }}>
        Coming in Phase 4: Browse and search agent memories with vector search
      </Typography>
    </Box>
  );
}
