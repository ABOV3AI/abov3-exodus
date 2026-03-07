import * as React from 'react';

import { AppTraining } from '../src/apps/training/AppTraining';

import { withNextJSPerPageLayout } from '~/common/layout/withLayout';


export default withNextJSPerPageLayout({ type: 'optima' }, () => <AppTraining />);
