import * as React from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Box, Button, FormControl, FormLabel, Input, Alert, CircularProgress } from '@mui/joy';

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
        setError('Invalid email or password');
      } else if (result?.ok) {
        // Successful login - redirect to home
        router.push('/');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Login error:', err);
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

      <FormControl required>
        <FormLabel>Email</FormLabel>
        <Input
          type='email'
          placeholder='you@example.com'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          autoComplete='email'
          autoFocus
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
          autoComplete='current-password'
        />
      </FormControl>

      <Button
        type='submit'
        fullWidth
        disabled={isLoading}
        sx={{ mt: 1 }}
        startDecorator={isLoading && <CircularProgress size='sm' />}
      >
        {isLoading ? 'Signing in...' : 'Sign In'}
      </Button>
    </Box>
  );
}
