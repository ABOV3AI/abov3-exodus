'use client';

/**
 * JobsView - View showing jobs for all profiles or filtered by profile
 */

import * as React from 'react';

import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/joy';

import { apiQueryCloud } from '~/common/util/trpc.client';
import { useNepheshUI } from '../store-nephesh';


export function JobsView() {

  const { jobsFilter } = useNepheshUI();

  // Fetch jobs
  const { data: jobs, isLoading } = apiQueryCloud.nephesh.listJobs.useQuery({
    profileId: jobsFilter.profileId,
    status: jobsFilter.status,
    limit: 50,
  });

  if (isLoading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography level='body-lg' sx={{ color: 'text.tertiary' }}>
          Loading jobs...
        </Typography>
      </Box>
    );
  }

  if (!jobs || jobs.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography level='body-lg' sx={{ color: 'text.tertiary' }}>
          No jobs yet. Execute a task to create one!
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
      <Stack spacing={2}>
        {jobs.map((job: any) => (
          <Card key={job.id}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography level='title-md'>{job.name}</Typography>
                <Chip
                  size='sm'
                  variant='soft'
                  color={
                    job.status === 'COMPLETED' ? 'success' :
                    job.status === 'ERROR' ? 'danger' :
                    job.status === 'RUNNING' ? 'primary' :
                    'neutral'
                  }
                >
                  {job.status}
                </Chip>
              </Box>
              <Typography level='body-xs' sx={{ color: 'text.tertiary', mb: 1 }}>
                Profile: {(job as any).profile?.name || 'Unknown'}
              </Typography>
              {job.inputPrompt && (
                <Typography level='body-sm' sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                  &ldquo;{job.inputPrompt.substring(0, 100)}{job.inputPrompt.length > 100 ? '...' : ''}&rdquo;
                </Typography>
              )}
              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                  Type: {job.type}
                </Typography>
                <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                  Tokens: {job.totalTokens}
                </Typography>
                {job.completedAt && (
                  <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                    Completed: {new Date(job.completedAt).toLocaleString()}
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Box>
  );
}
