import * as React from 'react';

import { AppFlowCore } from '~/apps/flowcore/AppFlowCore';

import { withNextJSPerPageLayout } from '~/common/layout/withLayout';


export default withNextJSPerPageLayout({ type: 'optima' }, () => {
  return <AppFlowCore />;
});
