import * as React from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Box, Button, FormControl, FormLabel, Input, Alert, CircularProgress, FormHelperText } from '@mui/joy';

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
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
      // Call signup API
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create account');
        setIsLoading(false);
        return;
      }

      // Auto sign in after successful signup
      const signInResult = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        setError('Account created but sign in failed. Please sign in manually.');
      } else if (signInResult?.ok) {
        // Successful signup and login - redirect to home
        router.push('/');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Signup error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box component='form' onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {error && (
        <Alert color='danger' variant='soft'>
          {error}
        </Alert>
      )}

      <FormControl>
        <FormLabel>Name (optional)</FormLabel>
        <Input
          type='text'
          placeholder='John Doe'
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isLoading}
          autoComplete='name'
          autoFocus
        />
      </FormControl>

      <FormControl required>
        <FormLabel>Email</FormLabel>
        <Input
          type='email'
          placeholder='you@example.com'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          autoComplete='email'
        />
      </FormControl>

      <FormControl required>
        <FormLabel>Password</FormLabel>
        <Input
          type='password'
          placeholder='••••••••'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          autoComplete='new-password'
        />
        <FormHelperText>Minimum 8 characters</FormHelperText>
      </FormControl>

      <FormControl required>
        <FormLabel>Confirm Password</FormLabel>
        <Input
          type='password'
          placeholder='••••••••'
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isLoading}
          autoComplete='new-password'
        />
      </FormControl>

      <Button
        type='submit'
        fullWidth
        disabled={isLoading}
        sx={{ mt: 1 }}
        startDecorator={isLoading && <CircularProgress size='sm' />}
      >
        {isLoading ? 'Creating account...' : 'Create Account'}
      </Button>
    </Box>
  );
}
