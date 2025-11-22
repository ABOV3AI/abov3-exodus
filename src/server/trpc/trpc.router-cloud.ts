import { createTRPCRouter } from './trpc.server';

import { browseRouter } from '~/modules/browse/browse.router';
import { tradeRouter } from '~/modules/trade/server/trade.router';
import { adminRouter } from './routers/admin.router';
import { flowcoreRouter } from '../api/routers/flowcore.router';

/**
 * Cloud rooter, which is geolocated in 1 location and separate from the other routers.
 * NOTE: at the time of writing, the location is aws|us-east-1
 */
export const appRouterCloud = createTRPCRouter({
  browse: browseRouter,
  trade: tradeRouter,
  admin: adminRouter,
  flowcore: flowcoreRouter,
});

// export type definition of API
export type AppRouterCloud = typeof appRouterCloud;