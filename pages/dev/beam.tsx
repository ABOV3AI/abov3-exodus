import * as React from 'react';

import { AppBeam } from '../../src/apps/prism/AppPrism';

import { withNextJSPerPageLayout } from '~/common/layout/withLayout';


export default withNextJSPerPageLayout({ type: 'optima' }, () => <AppBeam />);
