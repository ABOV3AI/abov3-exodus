import * as React from 'react';
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Box, Tab, TabList, TabPanel, Tabs, Typography, Link as JoyLink, CircularProgress } from '@mui/joy';
import Link from 'next/link';

import { Brand } from '~/common/app.config';
import { AuthLayout } from '~/apps/auth/components/AuthLayout';
import { LoginForm } from '~/apps/auth/components/LoginForm';
import { SignupForm } from '~/apps/auth/components/SignupForm';

export default function SignInPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<string>('login');

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
        }}
      >
        <CircularProgress />
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

      <AuthLayout title='Welcome' subtitle='Sign in to your account or create a new one'>
        <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value as string)}>
          <TabList sx={{ mb: 3 }}>
            <Tab value='login'>Sign In</Tab>
            <Tab value='signup'>Sign Up</Tab>
          </TabList>

          <TabPanel value='login' sx={{ p: 0 }}>
            <LoginForm />

            {/* Optional: Link to signup tab */}
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                Don't have an account?{' '}
                <JoyLink
                  component='button'
                  onClick={() => setActiveTab('signup')}
                  sx={{ fontWeight: 600 }}
                >
                  Sign up
                </JoyLink>
              </Typography>
            </Box>
          </TabPanel>

          <TabPanel value='signup' sx={{ p: 0 }}>
            <SignupForm />

            {/* Optional: Link to login tab */}
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                Already have an account?{' '}
                <JoyLink
                  component='button'
                  onClick={() => setActiveTab('login')}
                  sx={{ fontWeight: 600 }}
                >
                  Sign in
                </JoyLink>
              </Typography>
            </Box>
          </TabPanel>
        </Tabs>

        {/* Back to home link (for public access mode) */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            <Link href='/' passHref legacyBehavior>
              <JoyLink>← Back to {Brand.Title.Common}</JoyLink>
            </Link>
          </Typography>
        </Box>
      </AuthLayout>
    </>
  );
}
