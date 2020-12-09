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

import { Courses, Course, Tags } from './types';
import { createApiRef, DiscoveryApi } from '@backstage/core';

export const bridgeApiRef = createApiRef<BridgeApi>({
  id: 'plugin.bridgeapp.service',
  description: 'Used by the Bridge App plugin to make requests',
});

const DEFAULT_PROXY_PATH = '/bridge/api';

type Options = {
  discoveryApi: DiscoveryApi;
  proxyPath?: string;
};

export class BridgeApi {
  private readonly discoveryApi: DiscoveryApi;
  private readonly proxyPath: string;

  constructor(options: Options) {
    this.discoveryApi = options.discoveryApi;
    this.proxyPath = options.proxyPath ?? DEFAULT_PROXY_PATH;
  }

  private async getApiUrl() {
    const proxyUrl = await this.discoveryApi.getBaseUrl('proxy');
    return proxyUrl + this.proxyPath;
  }

  async listAllCourses(): Promise<Courses> {
    const URL = await this.getApiUrl();

    const response = await fetch(`${URL}/learner/library_items`);

    if (!response.ok) {
      throw new Error(
        `List request failed to ${URL} with ${response.status} ${response.statusText}`,
      );
    }

    const courses: Courses = await response.json();

    return courses;
  }

  async listCourses(tag: string): Promise<Courses | string> {
    const URL = await this.getApiUrl();

    const getTag = await fetch(
      `${URL}/learner/tags?search=${encodeURIComponent(tag)}`,
    );

    if (!getTag.ok) {
      throw new Error(
        `Get tag request failed to ${URL}/learner/tags?search=${tag} with ${getTag.status} ${getTag.statusText}`,
      );
    }

    const tagResult: Tags = await getTag.json();

    if (tagResult.tags[0].name.toLowerCase() !== tag) {
      return 'Tag not found';
    }

    const response = await fetch(
      `${URL}/learner/library_items?tags=${encodeURIComponent(
        tagResult.tags[0].id,
      )}`,
    );

    if (!response.ok) {
      throw new Error(
        `List request failed to ${URL} with ${response.status} ${response.statusText}`,
      );
    }

    const courses: Courses = await response.json();
    return courses;
  }

  async getCourse(projectId: string): Promise<Course> {
    const url = `${this.getApiUrl()}/${projectId}`;
    const response = await fetch(url, {
      headers: {},
    });

    if (!response.ok) {
      throw new Error(
        `Get request failed to ${url} with ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  }
}
