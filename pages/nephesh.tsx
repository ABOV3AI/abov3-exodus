import * as React from 'react';

import { AppNephesh } from '../src/apps/nephesh/AppNephesh';

import { withNextJSPerPageLayout } from '~/common/layout/withLayout';


export default withNextJSPerPageLayout({ type: 'optima' }, () => <AppNephesh />);
