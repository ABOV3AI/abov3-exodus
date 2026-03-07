import { QueryClient } from '@tanstack/react-query';

const defaultQueryClientOptions = {
  defaultOptions: {
    queries: {
      retry: false,
      // call functions even when the network is disconnected; this makes 127.0.0.1 work, while probably not causing other issues
      networkMode: 'always' as const,
      refetchOnReconnect: false, // implied by networkMode: always
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
      networkMode: 'always' as const,
    },
  },
};

let queryClient: QueryClient | null = null;
let queryClientCloud: QueryClient | null = null;

/** Query client for edge tRPC (primary) */
export function reactQueryClientSingleton(): QueryClient {
  if (!queryClient) {
    queryClient = new QueryClient(defaultQueryClientOptions);
  }
  return queryClient;
}

/** Separate query client for cloud tRPC to avoid context conflicts */
export function reactQueryClientCloudSingleton(): QueryClient {
  if (!queryClientCloud) {
    queryClientCloud = new QueryClient(defaultQueryClientOptions);
  }
  return queryClientCloud;
}
