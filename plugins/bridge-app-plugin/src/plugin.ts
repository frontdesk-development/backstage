/*
 * Copyright 2020 Spotify AB
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// import { createPlugin, createRouteRef } from '@backstage/core';
// import CourseListPage from './components/CourseListPage';

// export const rootRouteRef = createRouteRef({
//   path: '/bridge-app-plugin',
//   title: 'bridge-app-plugin',
// });

// export const plugin = createPlugin({
//   id: 'bridge-app-plugin',
//   register({ router }) {
//     router.addRoute(rootRouteRef, CourseListPage);
//   },
// });

/*
 * Copyright 2020 Spotify AB
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  createPlugin,
  createRouteRef,
  createApiFactory,
  discoveryApiRef,
} from '@backstage/core';
import { bridgeApiRef, BridgeApi } from './api';

export const bridgeRouteRef = createRouteRef({
  path: '',
  title: 'Bridge App plugin',
});
export const courseRouteRef = createRouteRef({
  path: '/course',
  title: 'Bridge App course page',
});

export const plugin = createPlugin({
  id: 'bridge-app',
  apis: [
    createApiFactory({
      api: bridgeApiRef,
      deps: { discoveryApi: discoveryApiRef },
      factory: ({ discoveryApi }) => new BridgeApi({ discoveryApi }),
    }),
  ],
});
