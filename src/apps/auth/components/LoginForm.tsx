/**
 * Login Form - Ultra Premium Dark Theme
 *
 * World-class form design for the most powerful AI tool.
 */
import * as React from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Box, Button, FormControl, FormLabel, Input, Alert, CircularProgress, Typography } from '@mui/joy';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

// Helper to get cookie value
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

// Helper to delete cookie
function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

// Validate callback URL is internal only (prevent open redirect)
function isValidCallback(url: string): boolean {
  if (!url) return false;
  if (!url.startsWith('/') || url.startsWith('//')) return false;
  if (url.includes('://')) return false;
  return true;
}

// Premium dark input styles
const premiumInputStyles = {
  '--Input-focusedThickness': '0px',
  '--Input-focusedHighlight': 'none',
  backgroundColor: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '12px',
  color: '#ffffff',
  fontSize: '0.95rem',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
    boxShadow: '0 0 0 4px rgba(139, 92, 246, 0.05)',
  },
  '&:focus-within': {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(139, 92, 246, 0.5)',
    boxShadow: '0 0 0 4px rgba(139, 92, 246, 0.1), 0 0 20px rgba(139, 92, 246, 0.2)',
  },
  '& input': {
    color: '#ffffff',
    fontWeight: 400,
    '&::placeholder': {
      color: 'rgba(255, 255, 255, 0.25)',
    },
  },
  '& .MuiInput-startDecorator': {
    color: 'rgba(139, 92, 246, 0.6)',
  },
};

const premiumLabelStyles = {
  color: 'rgba(255, 255, 255, 0.8)',
  fontWeight: 600,
  fontSize: '0.85rem',
  mb: 1,
  letterSpacing: '0.02em',
};

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid credentials. Please try again.');
      } else if (result?.ok) {
        const callback = getCookie('auth.callback');
        deleteCookie('auth.callback');
        const redirectTo = callback && isValidCallback(callback) ? callback : '/';
        router.push(redirectTo);
      }
    } catch (err) {
      setError('Connection error. Please try again.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {error && (
        <Alert
          color="danger"
          variant="soft"
          sx={{
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '12px',
            py: 1.5,
          }}
        >
          <Typography sx={{ color: '#fca5a5', fontSize: '0.9rem', fontWeight: 500 }}>{error}</Typography>
        </Alert>
      )}

      <FormControl required>
        <FormLabel sx={premiumLabelStyles}>Email Address</FormLabel>
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          autoComplete="email"
          autoFocus
          startDecorator={<EmailIcon sx={{ fontSize: 20 }} />}
          sx={premiumInputStyles}
          slotProps={{
            input: {
              sx: { py: 1.5, px: 2 },
            },
          }}
        />
      </FormControl>

      <FormControl required>
        <FormLabel sx={premiumLabelStyles}>Password</FormLabel>
        <Input
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          autoComplete="current-password"
          startDecorator={<LockIcon sx={{ fontSize: 20 }} />}
          sx={premiumInputStyles}
          slotProps={{
            input: {
              sx: { py: 1.5, px: 2 },
            },
          }}
        />
      </FormControl>

      <Button
        type="submit"
        fullWidth
        disabled={isLoading}
        sx={{
          mt: 0.5,
          py: 1.5,
          background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.9) 0%, rgba(59, 130, 246, 0.9) 100%)',
          color: '#ffffff',
          fontWeight: 600,
          fontSize: '1rem',
          letterSpacing: '0.02em',
          borderRadius: '12px',
          border: 'none',
          boxShadow: '0 4px 20px rgba(56, 189, 248, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1), transparent)',
            opacity: 0,
            transition: 'opacity 0.3s ease',
          },
          '&:hover': {
            background: 'linear-gradient(135deg, rgba(56, 189, 248, 1) 0%, rgba(59, 130, 246, 1) 100%)',
            boxShadow: '0 8px 30px rgba(56, 189, 248, 0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
            transform: 'translateY(-2px)',
            '&::before': {
              opacity: 1,
            },
          },
          '&:active': {
            transform: 'translateY(0)',
            boxShadow: '0 2px 10px rgba(56, 189, 248, 0.4)',
          },
          '&:disabled': {
            background: 'rgba(56, 189, 248, 0.3)',
            color: 'rgba(255, 255, 255, 0.5)',
            boxShadow: 'none',
          },
        }}
      >
        {isLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size="sm" sx={{ '--CircularProgress-size': '20px', color: '#fff' }} />
            <span>Authenticating...</span>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <span>Sign In</span>
            <ArrowForwardIcon sx={{ fontSize: 18, transition: 'transform 0.3s ease' }} />
          </Box>
        )}
      </Button>
    </Box>
  );
}
