import * as React from 'react';

import { Button, Card, CardContent, Grid, Typography } from '@mui/joy';
import RocketLaunchRounded from '@mui/icons-material/RocketLaunchRounded';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';

import { Link } from '~/common/components/Link';
import { clientUtmSource } from '~/common/util/pwaUtils';


export const abov3Url = 'https://abov3.com' + clientUtmSource('upgrade');

export function BigAgiProNewsCallout() {

  const abov3SupportUrl = 'https://abov3.com/support';

  return (
    <Card variant='solid' color='primary' invertedColors>
      <CardContent sx={{ gap: 2 }}>
        <Typography level='title-lg'>ABOV3 Exodus ✨</Typography>

        <Typography level='title-sm' sx={{ lineHeight: 'xl' }}>
          Professional AI workspace with <b>Prism</b> multi-model reasoning, <b>Personas</b>, and <b>local-first</b> architecture for complete data control.
        </Typography>

        <Grid container spacing={1}>
          <Grid xs={12} sm={7}>
            <Button
              size='lg'
              fullWidth
              variant='solid'
              color='neutral'
              endDecorator={<RocketLaunchRounded />}
              component={Link}
              href={abov3Url}
              noLinkStyle
              target='_blank'
            >
              Visit ABOV3.com
            </Button>
          </Grid>

          <Grid xs={12} sm={5} sx={{ display: 'flex', flexAlign: 'center', justifyContent: 'center' }}>
            <Button
              fullWidth
              variant='soft'
              color='primary'
              endDecorator={<SupportAgentIcon />}
              component={Link}
              href={abov3SupportUrl}
              noLinkStyle
              target='_blank'
            >
              Support
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}