/**
 * Admin Panel Modal
 *
 * Modal dialog for admin functions - user management and permissions.
 */

import * as React from 'react';
import { Box } from '@mui/joy';

import { GoodModal } from '~/common/components/modals/GoodModal';
import { UserPermissionsPanel } from './UserPermissionsPanel';

export function AdminModal(props: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <GoodModal
      open={props.open}
      onClose={props.onClose}
      title='Admin Panel'
      sx={{
        maxWidth: 900,
        minHeight: 500,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        <UserPermissionsPanel />
      </Box>
    </GoodModal>
  );
}
