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
  CloudBuildOptions,
  getMe,
  getBuildSummaries,
  getFullBuild,
  postBuildActions,
  BuildAction,
  BuildWithSteps,
  BuildStepAction,
  BuildSummary,
  GitType,
} from 'cloudbuild-api';
import { createApiRef } from '@backstage/core';

export { GitType };
export type { BuildWithSteps, BuildStepAction, BuildSummary };

export const cloudBuildApiRef = createApiRef<CloudBuildApi>({
  id: 'plugin.cloudbuild.service',
  description: 'Used by the CloudBuild plugin to make requests',
});

export class CloudBuildApi {
  apiUrl: string;
  constructor(apiUrl: string = '/cloudbuild/api') {
    this.apiUrl = apiUrl;
  }

  async retry(buildNumber: number, options: CloudBuildOptions) {
    return postBuildActions(options.token, buildNumber, BuildAction.RETRY, {
      circleHost: this.apiUrl,
      ...options.vcs,
    });
  }

  async getBuilds(
    { limit = 10, offset = 0 }: { limit: number; offset: number },
    options: CloudBuildOptions,
  ) {
    return getBuildSummaries(options.token, {
      options: {
        limit,
        offset,
      },
      vcs: {},
      circleHost: this.apiUrl,
      ...options,
    });
  }

  async getUser(options: CloudBuildOptions) {
    return getMe(options.token, { circleHost: this.apiUrl, ...options });
  }

  async getBuild(buildNumber: number, options: CloudBuildOptions) {
    return getFullBuild(options.token, buildNumber, {
      circleHost: this.apiUrl,
      ...options.vcs,
    });
  }
}
