/**
 * Activate Invitation Form - Ultra Premium Dark Theme
 *
 * Form for activating an account with an invitation code.
 * Exodus is invitation-only during early access.
 */
import * as React from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Box, Button, FormControl, FormLabel, Input, Alert, CircularProgress, FormHelperText, Typography } from '@mui/joy';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import KeyIcon from '@mui/icons-material/Key';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

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
    borderColor: 'rgba(56, 189, 248, 0.3)',
    boxShadow: '0 0 0 4px rgba(56, 189, 248, 0.05)',
  },
  '&:focus-within': {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(56, 189, 248, 0.5)',
    boxShadow: '0 0 0 4px rgba(56, 189, 248, 0.1), 0 0 20px rgba(56, 189, 248, 0.2)',
  },
  '& input': {
    color: '#ffffff',
    fontWeight: 400,
    '&::placeholder': {
      color: 'rgba(255, 255, 255, 0.25)',
    },
  },
  '& .MuiInput-startDecorator': {
    color: 'rgba(56, 189, 248, 0.6)',
  },
};

// Special styling for invitation code input
const invitationCodeStyles = {
  ...premiumInputStyles,
  '& input': {
    color: '#ffffff',
    fontWeight: 600,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    fontFamily: 'monospace',
    fontSize: '1.1rem',
    '&::placeholder': {
      color: 'rgba(255, 255, 255, 0.25)',
      letterSpacing: '0.05em',
      textTransform: 'none',
      fontFamily: 'inherit',
      fontSize: '0.95rem',
    },
  },
  '&:focus-within': {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(251, 191, 36, 0.5)',
    boxShadow: '0 0 0 4px rgba(251, 191, 36, 0.1), 0 0 20px rgba(251, 191, 36, 0.2)',
  },
  '& .MuiInput-startDecorator': {
    color: 'rgba(251, 191, 36, 0.7)',
  },
};

const premiumLabelStyles = {
  color: 'rgba(255, 255, 255, 0.8)',
  fontWeight: 600,
  fontSize: '0.85rem',
  mb: 1,
  letterSpacing: '0.02em',
};

export function ActivateInvitationForm() {
  const router = useRouter();
  const [invitationCode, setInvitationCode] = React.useState('');
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  // Format invitation code as user types (uppercase, alphanumeric only)
  const handleInvitationCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    setInvitationCode(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (invitationCode.length !== 8) {
      setError('Invitation code must be 8 characters');
      return;
    }

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/activate-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, invitationCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to activate invitation');
        setIsLoading(false);
        return;
      }

      // Auto sign in after successful activation
      const signInResult = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        setError('Account created but sign in failed. Please sign in manually.');
      } else if (signInResult?.ok) {
        router.push('/');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
      console.error('Activation error:', err);
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

      {/* Invitation Code - Prominent placement */}
      <FormControl required>
        <FormLabel sx={{ ...premiumLabelStyles, color: 'rgba(251, 191, 36, 0.9)' }}>Invitation Code</FormLabel>
        <Input
          type="text"
          placeholder="Enter your 8-character code"
          value={invitationCode}
          onChange={handleInvitationCodeChange}
          disabled={isLoading}
          autoComplete="off"
          autoFocus
          startDecorator={<KeyIcon sx={{ fontSize: 20 }} />}
          sx={invitationCodeStyles}
          slotProps={{
            input: {
              sx: { py: 1.5, px: 2, textAlign: 'center' },
            },
          }}
        />
        <FormHelperText sx={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '0.75rem', mt: 0.5 }}>
          Provided by invitation only
        </FormHelperText>
      </FormControl>

      <Box sx={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', pt: 2.5, mt: 0.5 }}>
        <Typography level="body-xs" sx={{ color: 'rgba(255, 255, 255, 0.4)', mb: 2, textAlign: 'center' }}>
          Create your account
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <FormControl required>
            <FormLabel sx={premiumLabelStyles}>Name</FormLabel>
            <Input
              type="text"
              placeholder="Your display name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              autoComplete="name"
              startDecorator={<PersonIcon sx={{ fontSize: 20 }} />}
              sx={premiumInputStyles}
              slotProps={{
                input: {
                  sx: { py: 1.5, px: 2 },
                },
              }}
            />
            <FormHelperText sx={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '0.75rem', mt: 0.5 }}>
              AI models will know you by this name
            </FormHelperText>
          </FormControl>

          <FormControl required>
            <FormLabel sx={premiumLabelStyles}>Email Address</FormLabel>
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              autoComplete="email"
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
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              autoComplete="new-password"
              startDecorator={<LockIcon sx={{ fontSize: 20 }} />}
              sx={premiumInputStyles}
              slotProps={{
                input: {
                  sx: { py: 1.5, px: 2 },
                },
              }}
            />
            <FormHelperText sx={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '0.75rem', mt: 0.5 }}>
              Minimum 8 characters
            </FormHelperText>
          </FormControl>

          <FormControl required>
            <FormLabel sx={premiumLabelStyles}>Confirm Password</FormLabel>
            <Input
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              autoComplete="new-password"
              startDecorator={<LockIcon sx={{ fontSize: 20 }} />}
              sx={premiumInputStyles}
              slotProps={{
                input: {
                  sx: { py: 1.5, px: 2 },
                },
              }}
            />
          </FormControl>
        </Box>
      </Box>

      <Button
        type="submit"
        fullWidth
        disabled={isLoading || invitationCode.length !== 8}
        sx={{
          mt: 0.5,
          py: 1.5,
          background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.9) 0%, rgba(245, 158, 11, 0.9) 100%)',
          color: '#000000',
          fontWeight: 600,
          fontSize: '1rem',
          letterSpacing: '0.02em',
          borderRadius: '12px',
          border: 'none',
          boxShadow: '0 4px 20px rgba(251, 191, 36, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.2), transparent)',
            opacity: 0,
            transition: 'opacity 0.3s ease',
          },
          '&:hover': {
            background: 'linear-gradient(135deg, rgba(251, 191, 36, 1) 0%, rgba(245, 158, 11, 1) 100%)',
            boxShadow: '0 8px 30px rgba(251, 191, 36, 0.5), inset 0 1px 0 rgba(255,255,255,0.3)',
            transform: 'translateY(-2px)',
            '&::before': {
              opacity: 1,
            },
          },
          '&:active': {
            transform: 'translateY(0)',
            boxShadow: '0 2px 10px rgba(251, 191, 36, 0.4)',
          },
          '&:disabled': {
            background: 'rgba(251, 191, 36, 0.2)',
            color: 'rgba(0, 0, 0, 0.4)',
            boxShadow: 'none',
          },
        }}
      >
        {isLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size="sm" sx={{ '--CircularProgress-size': '20px', color: '#000' }} />
            <span>Activating...</span>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <span>Activate Invitation</span>
            <ArrowForwardIcon sx={{ fontSize: 18, transition: 'transform 0.3s ease' }} />
          </Box>
        )}
      </Button>
    </Box>
  );
}
