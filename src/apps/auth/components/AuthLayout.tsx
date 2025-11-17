import * as React from 'react';
import { Box, Container, Sheet, Typography } from '@mui/joy';

import { Brand } from '~/common/app.config';

export function AuthLayout(props: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        p: 2,
      }}
    >
      <Container maxWidth='sm'>
        <Sheet
          variant='outlined'
          sx={{
            borderRadius: 'lg',
            p: 4,
            boxShadow: 'lg',
            backgroundColor: 'background.surface',
          }}
        >
          {/* Logo/Brand */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography
              level='h2'
              sx={{
                mb: 1,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 700,
              }}
            >
              {Brand.Title.Common}
            </Typography>
            {Brand.Meta.Description && (
              <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                {Brand.Meta.Description}
              </Typography>
            )}
          </Box>

          {/* Page Title */}
          <Box sx={{ mb: 3 }}>
            <Typography level='h3' sx={{ mb: 0.5 }}>
              {props.title}
            </Typography>
            {props.subtitle && (
              <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                {props.subtitle}
              </Typography>
            )}
          </Box>

          {/* Form Content */}
          {props.children}
        </Sheet>
      </Container>
    </Box>
  );
}
