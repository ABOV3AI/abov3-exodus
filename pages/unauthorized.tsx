import * as React from 'react';
import { useRouter } from 'next/router';

import { Box, Button, Sheet, Typography } from '@mui/joy';
import BlockIcon from '@mui/icons-material/Block';
import HomeIcon from '@mui/icons-material/Home';

import { withNextJSPerPageLayout } from '~/common/layout/withLayout';

export default withNextJSPerPageLayout({ type: 'optima', suspendAutoModelsSetup: true }, () => {
  const router = useRouter();

  const handleGoHome = React.useCallback(() => {
    router.push('/');
  }, [router]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: 3,
        p: 4,
      }}
    >
      <Sheet
        variant="soft"
        color="danger"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 80,
          height: 80,
          borderRadius: '50%',
        }}
      >
        <BlockIcon sx={{ fontSize: 40 }} />
      </Sheet>

      <Typography level="h2" textAlign="center">
        Access Denied
      </Typography>

      <Typography level="body-lg" textAlign="center" color="neutral" sx={{ maxWidth: 500 }}>
        You do not have permission to access this feature. This feature is currently in beta and
        requires explicit access grants.
      </Typography>

      <Typography level="body-sm" textAlign="center" color="neutral">
        If you believe you should have access, please contact the administrator.
      </Typography>

      <Button
        variant="solid"
        color="primary"
        size="lg"
        startDecorator={<HomeIcon />}
        onClick={handleGoHome}
        sx={{ mt: 2 }}
      >
        Return to Chat
      </Button>
    </Box>
  );
});
