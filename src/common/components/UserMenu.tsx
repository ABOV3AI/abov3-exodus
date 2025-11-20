import * as React from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import {
  Avatar,
  Box,
  Button,
  Dropdown,
  IconButton,
  ListDivider,
  Menu,
  MenuButton,
  MenuItem,
  Typography,
} from '@mui/joy';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';

export function UserMenu(props: { variant?: 'button' | 'icon' }) {
  const { variant = 'icon' } = props;
  const { data: session, status } = useSession();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/');
  };

  const handleSignIn = () => {
    router.push('/auth/signin');
  };

  // Loading
  if (status === 'loading') {
    return (
      <IconButton variant='plain' color='neutral' disabled>
        <AccountCircleIcon />
      </IconButton>
    );
  }

  // Not signed in
  if (status === 'unauthenticated' || !session) {
    if (variant === 'button') {
      return (
        <Button
          variant='outlined'
          color='neutral'
          startDecorator={<LoginIcon />}
          onClick={handleSignIn}
        >
          Sign In
        </Button>
      );
    }

    return (
      <IconButton
        variant='outlined'
        color='neutral'
        onClick={handleSignIn}
        aria-label='Sign in'
      >
        <AccountCircleIcon />
      </IconButton>
    );
  }

  // Signed in - show user menu
  const userInitial = session.user?.name?.charAt(0)?.toUpperCase() || session.user?.email?.charAt(0)?.toUpperCase() || 'U';
  const userDisplay = session.user?.name || session.user?.email || 'User';

  return (
    <Dropdown>
      <MenuButton
        slots={{ root: variant === 'button' ? Button : IconButton }}
        slotProps={{
          root: {
            variant: 'plain',
            color: 'neutral',
            'aria-label': 'User menu',
          } as any,
        }}
      >
        <Avatar
          size='sm'
          src={session.user?.image || undefined}
          alt={userDisplay}
        >
          {userInitial}
        </Avatar>
        {variant === 'button' && (
          <Box sx={{ ml: 1, textAlign: 'left' }}>
            <Typography level='body-sm' sx={{ fontWeight: 600 }}>
              {userDisplay}
            </Typography>
            <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
              {session.user?.email}
            </Typography>
          </Box>
        )}
      </MenuButton>

      <Menu placement='bottom-end' sx={{ minWidth: 200, zIndex: 1500 }}>
        {/* User info header */}
        <MenuItem disabled sx={{ pointerEvents: 'none' }}>
          <Box>
            <Typography level='body-sm' sx={{ fontWeight: 600 }}>
              {userDisplay}
            </Typography>
            {session.user?.email && (
              <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                {session.user.email}
              </Typography>
            )}
          </Box>
        </MenuItem>

        <ListDivider />

        {/* Account Settings */}
        <MenuItem onClick={() => router.push('/settings')}>
          <SettingsIcon fontSize='small' />
          <Box sx={{ ml: 1 }}>Settings</Box>
        </MenuItem>

        {/* Admin Panel (if user is admin) */}
        {(session.user as any)?.isAdmin && (
          <MenuItem onClick={() => router.push('/admin')}>
            <PersonIcon fontSize='small' />
            <Box sx={{ ml: 1 }}>Admin Panel</Box>
          </MenuItem>
        )}

        <ListDivider />

        {/* Sign Out */}
        <MenuItem onClick={handleSignOut} color='danger'>
          <LogoutIcon fontSize='small' />
          <Box sx={{ ml: 1 }}>Sign Out</Box>
        </MenuItem>
      </Menu>
    </Dropdown>
  );
}
