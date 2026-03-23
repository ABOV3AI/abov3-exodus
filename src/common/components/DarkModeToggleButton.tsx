import * as React from 'react';

import { Button, IconButton, useColorScheme } from '@mui/joy';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';

export const darkModeToggleButtonSx = {
  boxShadow: 'sm',
  backgroundColor: 'background.surface',
  '&:hover': {
    backgroundColor: 'background.popup',
  },
} as const;

export function DarkModeToggleButton(props: { hasText?: boolean }) {

  // external state
  const { mode: colorMode, setMode: setColorMode } = useColorScheme();

  // Load user's theme preference from database on mount
  React.useEffect(() => {
    const loadThemeFromDatabase = async () => {
      try {
        const response = await fetch('/api/auth/theme');
        if (response.ok) {
          const data = await response.json();
          if (data.theme && data.theme !== colorMode) {
            setColorMode(data.theme);
          }
        }
      } catch (error) {
        // Ignore errors (user might not be authenticated)
        console.debug('[theme] Could not load theme from database:', error);
      }
    };
    loadThemeFromDatabase();
  }, []);

  const handleToggleDarkMode = async (event: React.MouseEvent) => {
    event.stopPropagation();
    const newMode = colorMode === 'dark' ? 'light' : 'dark';

    // Update UI immediately
    setColorMode(newMode);

    // Save to database in background
    try {
      await fetch('/api/auth/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newMode }),
      });
    } catch (error) {
      // Ignore errors (theme still works via localStorage)
      console.debug('[theme] Could not save theme to database:', error);
    }
  };

  return props.hasText ? (
    <Button
      variant='soft'
      color='neutral'
      onClick={handleToggleDarkMode}
      sx={darkModeToggleButtonSx}
      startDecorator={colorMode !== 'dark' ? <DarkModeIcon color='primary' /> : <LightModeIcon />}
    >
      {colorMode === 'dark' ? 'Light Mode' : 'Dark Mode'}
    </Button>
  ) : (
    <IconButton size='sm' variant='soft' onClick={handleToggleDarkMode} sx={{ ml: 'auto', /*mr: '2px',*/ my: '-0.25rem' /* absorb the menuItem padding */ }}>
      {colorMode !== 'dark' ? <DarkModeIcon /> : <LightModeIcon />}
    </IconButton>
  );
}