/**
 * User Permissions Panel
 *
 * Admin UI for managing user feature permissions.
 * Allows toggling Nephesh, Train, FlowCore access per user.
 */

import * as React from 'react';

import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  IconButton,
  Input,
  Sheet,
  Table,
  Tooltip,
  Typography,
} from '@mui/joy';
import AddIcon from '@mui/icons-material/Add';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import StarIcon from '@mui/icons-material/Star';

import { apiQueryCloud } from '~/common/util/trpc.client';

import { CreateUserModal } from './CreateUserModal';

import type { FeatureFlag } from '~/common/stores/store-user-features';
import { ALL_FEATURE_FLAGS, FEATURE_LABELS } from '~/common/stores/store-user-features';


interface UserWithPermissions {
  id: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
  isMasterDev: boolean;
  role: string;
  createdAt: Date;
  features: FeatureFlag[];
}


export function UserPermissionsPanel() {
  // State
  const [search, setSearch] = React.useState('');
  const [createModalOpen, setCreateModalOpen] = React.useState(false);

  // Queries
  const usersQuery = apiQueryCloud.admin.listUsersWithPermissions.useQuery({
    limit: 100,
    offset: 0,
    search: search || undefined,
  });

  const updatePermissionMutation = apiQueryCloud.admin.updateUserPermission.useMutation({
    onSuccess: () => {
      usersQuery.refetch();
    },
  });

  // Handlers
  const handleSearchChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  const handleToggleFeature = React.useCallback(
    (userId: string, feature: FeatureFlag, currentlyGranted: boolean) => {
      updatePermissionMutation.mutate({
        userId,
        feature,
        granted: !currentlyGranted,
      });
    },
    [updatePermissionMutation]
  );

  const handleRefresh = React.useCallback(() => {
    usersQuery.refetch();
  }, [usersQuery]);

  const handleUserCreated = React.useCallback(() => {
    setCreateModalOpen(false);
    usersQuery.refetch();
  }, [usersQuery]);

  // Render
  const users = usersQuery.data?.users ?? [];
  const isLoading = usersQuery.isLoading || updatePermissionMutation.isPending;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Typography level="title-lg">User Permissions</Typography>
        <Box sx={{ flex: 1 }} />
        <Input
          placeholder="Search users..."
          startDecorator={<SearchIcon />}
          value={search}
          onChange={handleSearchChange}
          sx={{ minWidth: 200 }}
        />
        <IconButton variant="outlined" onClick={handleRefresh} disabled={isLoading}>
          <RefreshIcon />
        </IconButton>
        <Button
          variant="solid"
          color="primary"
          startDecorator={<PersonAddIcon />}
          onClick={() => setCreateModalOpen(true)}
        >
          Create User
        </Button>
      </Box>

      {/* Info */}
      <Typography level="body-sm" color="neutral">
        Toggle feature access for beta testers. Master developers have all features enabled.
      </Typography>

      {/* Loading */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Users Table */}
      {!usersQuery.isLoading && (
        <Sheet variant="outlined" sx={{ borderRadius: 'sm', overflow: 'auto' }}>
          <Table
            stickyHeader
            hoverRow
            sx={{
              '& thead th': { bgcolor: 'background.level1' },
              '& tbody td': { verticalAlign: 'middle' },
            }}
          >
            <thead>
              <tr>
                <th style={{ width: 250 }}>User</th>
                <th style={{ width: 100 }}>Role</th>
                {ALL_FEATURE_FLAGS.filter((f) => f !== 'ADMIN_PANEL').map((feature) => (
                  <th key={feature} style={{ width: 100, textAlign: 'center' }}>
                    {feature}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  onToggleFeature={handleToggleFeature}
                  isUpdating={updatePermissionMutation.isPending}
                />
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <Typography level="body-sm" color="neutral" sx={{ textAlign: 'center', py: 4 }}>
                      {search ? 'No users match your search.' : 'No users found.'}
                    </Typography>
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Sheet>
      )}

      {/* Total count */}
      {usersQuery.data && (
        <Typography level="body-xs" color="neutral">
          Showing {users.length} of {usersQuery.data.total} users
        </Typography>
      )}

      {/* Create User Modal */}
      <CreateUserModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={handleUserCreated}
      />
    </Box>
  );
}


function UserRow(props: {
  user: UserWithPermissions;
  onToggleFeature: (userId: string, feature: FeatureFlag, currentlyGranted: boolean) => void;
  isUpdating: boolean;
}) {
  const { user, onToggleFeature, isUpdating } = props;

  const isMasterOrAdmin = user.isMasterDev || user.role === 'ADMIN' || user.role === 'MASTER';

  return (
    <tr>
      {/* User info */}
      <td>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {user.isMasterDev && (
            <Tooltip title="Master Developer">
              <StarIcon color="warning" fontSize="small" />
            </Tooltip>
          )}
          <Box>
            <Typography level="body-sm" fontWeight="lg">
              {user.name || user.email}
            </Typography>
            {user.name && (
              <Typography level="body-xs" color="neutral">
                {user.email}
              </Typography>
            )}
          </Box>
        </Box>
      </td>

      {/* Role */}
      <td>
        <Chip
          size="sm"
          variant={isMasterOrAdmin ? 'solid' : 'soft'}
          color={user.isMasterDev ? 'warning' : user.isAdmin ? 'primary' : 'neutral'}
        >
          {user.role}
        </Chip>
      </td>

      {/* Feature toggles */}
      {ALL_FEATURE_FLAGS.filter((f) => f !== 'ADMIN_PANEL').map((feature) => {
        const hasFeature = isMasterOrAdmin || user.features.includes(feature);
        const isLocked = isMasterOrAdmin;

        return (
          <td key={feature} style={{ textAlign: 'center' }}>
            <Tooltip
              title={
                isLocked
                  ? `${user.isMasterDev ? 'Master devs' : 'Admins'} have all features`
                  : hasFeature
                    ? `Revoke ${FEATURE_LABELS[feature]}`
                    : `Grant ${FEATURE_LABELS[feature]}`
              }
            >
              <span>
                <Checkbox
                  checked={hasFeature}
                  disabled={isLocked || isUpdating}
                  onChange={() => onToggleFeature(user.id, feature, hasFeature)}
                  sx={isLocked ? { opacity: 0.6 } : undefined}
                />
              </span>
            </Tooltip>
          </td>
        );
      })}
    </tr>
  );
}
