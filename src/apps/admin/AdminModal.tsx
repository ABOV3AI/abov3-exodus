/**
 * Admin Panel Modal
 *
 * Modal dialog for admin functions - user management, permissions, and software updates.
 */

import * as React from 'react';
import { Box, Tab, TabList, TabPanel, Tabs } from '@mui/joy';
import PeopleIcon from '@mui/icons-material/People';
import SystemUpdateIcon from '@mui/icons-material/SystemUpdate';

import { GoodModal } from '~/common/components/modals/GoodModal';
import { useUserFeatures } from '~/common/stores/store-user-features';

import { SoftwareUpdatePanel } from './SoftwareUpdatePanel';
import { UserPermissionsPanel } from './UserPermissionsPanel';


export function AdminModal(props: {
  open: boolean;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = React.useState<string>('users');

  // Check if user is Master Developer (only they can see the update tab)
  const isMasterDev = useUserFeatures((state) => state.isMasterDev);

  return (
    <GoodModal
      open={props.open}
      onClose={props.onClose}
      title='Admin Panel'
      sx={{
        maxWidth: 950,
        minHeight: 550,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Tabs
        value={activeTab}
        onChange={(_, value) => setActiveTab(value as string)}
        sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        <TabList>
          <Tab value="users">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PeopleIcon fontSize="small" />
              Users
            </Box>
          </Tab>
          {isMasterDev && (
            <Tab value="updates">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SystemUpdateIcon fontSize="small" />
                Software Updates
              </Box>
            </Tab>
          )}
        </TabList>

        <TabPanel value="users" sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          <UserPermissionsPanel />
        </TabPanel>

        {isMasterDev && (
          <TabPanel value="updates" sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            <SoftwareUpdatePanel />
          </TabPanel>
        )}
      </Tabs>
    </GoodModal>
  );
}
