import * as React from 'react';

import { Button, Card, CardContent, Grid, Typography } from '@mui/joy';
import LaunchIcon from '@mui/icons-material/Launch';

import { Link } from '~/common/components/Link';


// export const prismReleaseDate = '2025-01-23T00:00:00Z';
export const prismBlogUrl = 'https://abov3.com/docs/prism-multi-model-reasoning';

export const prismNewsCallout =
  <Card variant='solid' invertedColors>
    <CardContent sx={{ gap: 2 }}>
      <Typography level='title-lg'>
        Prism - Enterprise Multi-Model AI Reasoning
      </Typography>
      <Typography level='body-sm'>
        Prism is ABOV3 Exodus&apos;s enterprise-grade multi-model reasoning engine that delivers superior insights by synthesizing diverse AI perspectives into focused, actionable intelligence. Like light through a prism, transform single queries into comprehensive analysis.
      </Typography>
      <Grid container spacing={1}>
        <Grid xs={12} sm={7}>
          <Button
            fullWidth variant='soft' color='primary' endDecorator={<LaunchIcon />}
            component={Link} href={prismBlogUrl} noLinkStyle target='_blank'
          >
            Learn More
          </Button>
        </Grid>
      </Grid>
    </CardContent>
  </Card>;