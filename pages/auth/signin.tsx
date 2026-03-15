/**
 * Sign In Page - Ultra Premium Dark Theme
 *
 * World-class design for the most powerful AI tool.
 */
import * as React from 'react';
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Box, Typography, Link as JoyLink, CircularProgress } from '@mui/joy';

import { Brand } from '~/common/app.config';
import { AuthLayout } from '~/apps/auth/components/AuthLayout';
import { LoginForm } from '~/apps/auth/components/LoginForm';
import { ActivateInvitationForm } from '~/apps/auth/components/ActivateInvitationForm';

export default function SignInPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<'login' | 'activate'>('login');

  // Redirect to home if already signed in
  React.useEffect(() => {
    if (status === 'authenticated') {
      router.push('/');
    }
  }, [status, router]);

  // Show loading while checking auth
  if (status === 'loading') {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000000',
        }}
      >
        <CircularProgress
          sx={{
            '--CircularProgress-trackColor': 'rgba(56, 189, 248, 0.1)',
            '--CircularProgress-progressColor': 'rgba(56, 189, 248, 0.8)',
            '--CircularProgress-size': '48px',
          }}
        />
      </Box>
    );
  }

  // Don't render if authenticated (will redirect)
  if (session) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Sign In - {Brand.Title.Common}</title>
      </Head>

      <AuthLayout title="Beyond Intelligence">
        {/* Custom Tab Switcher - Premium Design */}
        <Box
          sx={{
            display: 'flex',
            gap: 0.5,
            mb: 3,
            p: 0.5,
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          <Box
            component="button"
            onClick={() => setActiveTab('login')}
            sx={{
              flex: 1,
              py: 1,
              px: 2,
              backgroundColor: activeTab === 'login' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              border: activeTab === 'login' ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
              borderRadius: '8px',
              color: activeTab === 'login' ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              overflow: 'hidden',
              '&:hover': {
                backgroundColor: activeTab === 'login' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                color: activeTab === 'login' ? '#ffffff' : 'rgba(255, 255, 255, 0.8)',
              },
              '&::before': activeTab === 'login' ? {
                content: '""',
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1), transparent)',
                pointerEvents: 'none',
              } : {},
            }}
          >
            Sign In
          </Box>
          <Box
            component="button"
            onClick={() => setActiveTab('activate')}
            sx={{
              flex: 1,
              py: 1,
              px: 2,
              backgroundColor: activeTab === 'activate' ? 'rgba(251, 191, 36, 0.15)' : 'transparent',
              border: activeTab === 'activate' ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid transparent',
              borderRadius: '8px',
              color: activeTab === 'activate' ? '#fbbf24' : 'rgba(255, 255, 255, 0.5)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              overflow: 'hidden',
              '&:hover': {
                backgroundColor: activeTab === 'activate' ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                color: activeTab === 'activate' ? '#fbbf24' : 'rgba(255, 255, 255, 0.8)',
              },
              '&::before': activeTab === 'activate' ? {
                content: '""',
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1), transparent)',
                pointerEvents: 'none',
              } : {},
            }}
          >
            Activate
          </Box>
        </Box>

        {/* Form Content */}
        <Box sx={{ mb: 3 }}>
          {activeTab === 'login' ? <LoginForm /> : <ActivateInvitationForm />}
        </Box>

        {/* Toggle Link */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography level="body-sm" sx={{ color: 'rgba(255, 255, 255, 0.4)' }}>
            {activeTab === 'login' ? 'Have an invitation code?' : 'Already have an account?'}{' '}
            <JoyLink
              component="button"
              onClick={() => setActiveTab(activeTab === 'login' ? 'activate' : 'login')}
              sx={{
                fontWeight: 600,
                color: activeTab === 'login' ? 'rgba(251, 191, 36, 0.9)' : 'rgba(56, 189, 248, 0.9)',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
                '&:hover': {
                  color: '#ffffff',
                  textShadow: activeTab === 'login' ? '0 0 20px rgba(251, 191, 36, 0.5)' : '0 0 20px rgba(56, 189, 248, 0.5)',
                },
              }}
            >
              {activeTab === 'login' ? 'Activate invitation' : 'Sign in'}
            </JoyLink>
          </Typography>
        </Box>

      </AuthLayout>
    </>
  );
}
