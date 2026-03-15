import { createTRPCRouter } from './trpc.server';

import { backendRouter } from '~/modules/backend/backend.router';
import { browseRouter } from '~/modules/browse/browse.router';
import { tradeRouter } from '~/modules/trade/server/trade.router';
import { adminRouter } from './routers/admin.router';
import { flowcoreRouter } from '../api/routers/flowcore.router';
import { syncRouter } from './routers/sync.router';
import { paulineRouter } from '~/modules/pauline/pauline.router';

/**
 * Cloud rooter, which is geolocated in 1 location and separate from the other routers.
 * NOTE: at the time of writing, the location is aws|us-east-1
 */
export const appRouterCloud = createTRPCRouter({
  // NOTE: backend is duplicated here from edge router due to React Query context issues
  // where apiQuery calls sometimes route to cloud instead of edge
  backend: backendRouter,
  browse: browseRouter,
  trade: tradeRouter,
  admin: adminRouter,
  flowcore: flowcoreRouter,
  sync: syncRouter,
  pauline: paulineRouter,
});

// export type definition of API
export type AppRouterCloud = typeof appRouterCloud;