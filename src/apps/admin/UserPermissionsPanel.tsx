/**
 * User Permissions Panel
 *
 * Admin UI for managing user feature permissions, roles, and accounts.
 * Allows toggling Nephesh, Train, FlowCore access per user.
 * Supports editing user details and deleting users.
 */

import * as React from 'react';

import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Input,
  Modal,
  ModalClose,
  ModalDialog,
  Option,
  Select,
  Sheet,
  Table,
  Tooltip,
  Typography,
} from '@mui/joy';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import StarIcon from '@mui/icons-material/Star';
import WarningIcon from '@mui/icons-material/Warning';

import { apiQueryCloud } from '~/common/util/trpc.client';
import { useUserFeatures } from '~/common/stores/store-user-features';

import { CreateUserModal } from './CreateUserModal';
import { EditUserModal } from './EditUserModal';

import type { FeatureFlag } from '~/common/stores/store-user-features';
import { ALL_FEATURE_FLAGS, FEATURE_LABELS } from '~/common/stores/store-user-features';


type UserRole = 'USER' | 'DEVELOPER' | 'ADMIN' | 'MASTER';

const ROLE_COLORS: Record<UserRole, 'neutral' | 'primary' | 'warning' | 'success'> = {
  USER: 'neutral',
  DEVELOPER: 'success',
  ADMIN: 'primary',
  MASTER: 'warning',
};


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
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<UserWithPermissions | null>(null);

  // Current user info
  const { isMasterDev: currentUserIsMasterDev } = useUserFeatures();

  // Queries
  const usersQuery = apiQueryCloud.admin.listUsersWithPermissions.useQuery({
    limit: 100,
    offset: 0,
    search: search || undefined,
  });

  // Mutations
  const updatePermissionMutation = apiQueryCloud.admin.updateUserPermission.useMutation({
    onSuccess: () => {
      usersQuery.refetch();
    },
  });

  const updateRoleMutation = apiQueryCloud.admin.updateUserRole.useMutation({
    onSuccess: () => {
      usersQuery.refetch();
    },
  });

  const deleteUserMutation = apiQueryCloud.admin.deleteUser.useMutation({
    onSuccess: () => {
      setDeleteModalOpen(false);
      setSelectedUser(null);
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

  const handleRoleChange = React.useCallback(
    (userId: string, newRole: UserRole) => {
      updateRoleMutation.mutate({
        userId,
        role: newRole,
      });
    },
    [updateRoleMutation]
  );

  const handleRefresh = React.useCallback(() => {
    usersQuery.refetch();
  }, [usersQuery]);

  const handleUserCreated = React.useCallback(() => {
    setCreateModalOpen(false);
    usersQuery.refetch();
  }, [usersQuery]);

  const handleEditUser = React.useCallback((user: UserWithPermissions) => {
    setSelectedUser(user);
    setEditModalOpen(true);
  }, []);

  const handleEditComplete = React.useCallback(() => {
    setEditModalOpen(false);
    setSelectedUser(null);
    usersQuery.refetch();
  }, [usersQuery]);

  const handleDeleteUser = React.useCallback((user: UserWithPermissions) => {
    setSelectedUser(user);
    setDeleteModalOpen(true);
  }, []);

  const handleConfirmDelete = React.useCallback(() => {
    if (selectedUser) {
      deleteUserMutation.mutate({ userId: selectedUser.id });
    }
  }, [selectedUser, deleteUserMutation]);

  const handleCancelDelete = React.useCallback(() => {
    setDeleteModalOpen(false);
    setSelectedUser(null);
  }, []);

  // Render
  const users = usersQuery.data?.users ?? [];
  const isLoading = usersQuery.isLoading || updatePermissionMutation.isPending || updateRoleMutation.isPending;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Typography level="title-lg">User Management</Typography>
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
        Manage users, roles, and feature access. Master developers have all features enabled and cannot be modified.
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
                <th style={{ width: 220 }}>User</th>
                <th style={{ width: 130 }}>Role</th>
                {ALL_FEATURE_FLAGS.filter((f) => f !== 'ADMIN_PANEL').map((feature) => (
                  <th key={feature} style={{ width: 90, textAlign: 'center' }}>
                    {feature}
                  </th>
                ))}
                <th style={{ width: 100, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  onToggleFeature={handleToggleFeature}
                  onRoleChange={handleRoleChange}
                  onEdit={handleEditUser}
                  onDelete={handleDeleteUser}
                  isUpdating={updatePermissionMutation.isPending || updateRoleMutation.isPending}
                  currentUserIsMasterDev={currentUserIsMasterDev}
                />
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={7}>
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

      {/* Edit User Modal */}
      <EditUserModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onUpdated={handleEditComplete}
        user={selectedUser}
        currentUserIsMasterDev={currentUserIsMasterDev}
      />

      {/* Delete Confirmation Modal */}
      <DeleteUserConfirmDialog
        open={deleteModalOpen}
        user={selectedUser}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isDeleting={deleteUserMutation.isPending}
        error={deleteUserMutation.error?.message}
      />
    </Box>
  );
}


function UserRow(props: {
  user: UserWithPermissions;
  onToggleFeature: (userId: string, feature: FeatureFlag, currentlyGranted: boolean) => void;
  onRoleChange: (userId: string, role: UserRole) => void;
  onEdit: (user: UserWithPermissions) => void;
  onDelete: (user: UserWithPermissions) => void;
  isUpdating: boolean;
  currentUserIsMasterDev: boolean;
}) {
  const { user, onToggleFeature, onRoleChange, onEdit, onDelete, isUpdating, currentUserIsMasterDev } = props;

  const isMasterOrAdmin = user.isMasterDev || user.role === 'ADMIN' || user.role === 'MASTER';
  const canModify = !user.isMasterDev || currentUserIsMasterDev;
  const canDelete = !user.isMasterDev; // Even master devs can't delete other master devs via UI

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

      {/* Role Selector */}
      <td>
        {user.isMasterDev ? (
          <Chip size="sm" variant="solid" color="warning">
            MASTER
          </Chip>
        ) : (
          <Select
            size="sm"
            variant="soft"
            value={user.role as UserRole}
            onChange={(_, value) => value && onRoleChange(user.id, value)}
            disabled={isUpdating || !canModify}
            sx={{ minWidth: 100 }}
          >
            <Option value="USER">User</Option>
            <Option value="DEVELOPER">Developer</Option>
            <Option value="ADMIN">Admin</Option>
            {currentUserIsMasterDev && <Option value="MASTER">Master</Option>}
          </Select>
        )}
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

      {/* Actions */}
      <td>
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
          <Tooltip title="Edit user">
            <IconButton
              size="sm"
              variant="plain"
              color="neutral"
              onClick={() => onEdit(user)}
              disabled={isUpdating}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={canDelete ? 'Delete user' : 'Cannot delete Master Developer'}>
            <span>
              <IconButton
                size="sm"
                variant="plain"
                color="danger"
                onClick={() => onDelete(user)}
                disabled={isUpdating || !canDelete}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </td>
    </tr>
  );
}


function DeleteUserConfirmDialog(props: {
  open: boolean;
  user: UserWithPermissions | null;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
  error?: string;
}) {
  const { open, user, onConfirm, onCancel, isDeleting, error } = props;

  if (!user) return null;

  return (
    <Modal open={open} onClose={onCancel}>
      <ModalDialog variant="outlined" color="danger" sx={{ maxWidth: 400 }}>
        <ModalClose disabled={isDeleting} />
        <DialogTitle>
          <WarningIcon sx={{ mr: 1 }} />
          Delete User
        </DialogTitle>
        <Divider />
        <DialogContent>
          <Typography level="body-md" sx={{ mb: 2 }}>
            Are you sure you want to delete this user?
          </Typography>
          <Box
            sx={{
              p: 2,
              bgcolor: 'background.level1',
              borderRadius: 'sm',
              mb: 2,
            }}
          >
            <Typography level="body-sm" fontWeight="lg">
              {user.name || user.email}
            </Typography>
            {user.name && (
              <Typography level="body-xs" color="neutral">
                {user.email}
              </Typography>
            )}
          </Box>
          <Typography level="body-sm" color="danger">
            This action cannot be undone. All user data including conversations and settings will be permanently deleted.
          </Typography>
          {error && (
            <Typography level="body-sm" color="danger" sx={{ mt: 2 }}>
              Error: {error}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="plain" color="neutral" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="solid"
            color="danger"
            onClick={onConfirm}
            loading={isDeleting}
            startDecorator={<DeleteIcon />}
          >
            Delete User
          </Button>
        </DialogActions>
      </ModalDialog>
    </Modal>
  );
}
