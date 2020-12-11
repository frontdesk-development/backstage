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

import { OAuthApi } from '@backstage/core';
import { Octokit } from '@octokit/rest';
import { GcpApi } from './GcpApi';
import { Operation, Project, Metadata } from './types';

const BASE_URL =
  'https://content-cloudresourcemanager.googleapis.com/v1/projects';

export class GcpClient implements GcpApi {
  constructor(
    private readonly googleAuthApi: OAuthApi,
    private readonly githubAuthApi: OAuthApi,
  ) {}

  async listProjects(): Promise<Project[]> {
    const response = await fetch(BASE_URL, {
      headers: {
        Accept: '*/*',
        Authorization: `Bearer ${await this.getToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error(
        `List request failed to ${BASE_URL} with ${response.status} ${response.statusText}`,
      );
    }

    const { projects } = await response.json();
    return projects;
  }

  async getProject(projectId: string): Promise<Project> {
    const url = `${BASE_URL}/${projectId}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${await this.getToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Get request failed to ${url} with ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  }

  async createProject(options: {
    projectId: string;
    projectName: string;
  }): Promise<Operation> {
    const newProject: Project = {
      name: options.projectName,
      projectId: options.projectId,
    };

    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        Accept: '*/*',
        Authorization: `Bearer ${await this.getToken()}`,
      },
      body: JSON.stringify(newProject),
    });

    if (!response.ok) {
      throw new Error(
        `Create request failed to ${BASE_URL} with ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  }

  async getToken(): Promise<string> {
    // NOTE(freben): There's a .read-only variant of this scope that we could
    // use for readonly operations, but that means we would ask the user for a
    // second auth during creation and I decided to keep the wider scope for
    // all ops for now
    return this.googleAuthApi.getAccessToken(
      'https://www.googleapis.com/auth/cloud-platform',
    );
  }

  async createPr(metadata: Metadata): Promise<string> {
    const token = await this.githubAuthApi.getAccessToken(['repo']);
    const owner = metadata.owner;
    const repo = metadata.repo;

    const octo = new Octokit({
      auth: token,
    });

    const state = {
      curTime: new Date().toISOString().split(':').join('-'),
    };
    const branchName = `frontdesk-integration-${state.curTime}`;

    const repoData = await octo.repos
      .get({
        owner,
        repo,
      })
      .catch(e => {
        throw new Error(formatHttpErrorMessage("Couldn't fetch repo data", e));
      });

    const parentRef = await octo.git
      .getRef({
        owner,
        repo,
        ref: `heads/${repoData.data.default_branch}`,
      })
      .catch(e => {
        throw new Error(
          formatHttpErrorMessage("Couldn't fetch default branch data", e),
        );
      });

    await octo.git
      .createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: parentRef.data.object.sha,
      })
      .catch(e => {
        throw new Error(
          formatHttpErrorMessage(
            `Couldn't create a new branch with name '${branchName}'`,
            e,
          ),
        );
      });

    const groupFileName = `terraform/trivago/${metadata.pilar}/${metadata.teamName}/groups.tf`;

    await octo.repos
      .createOrUpdateFileContents({
        owner,
        repo,
        path: groupFileName,
        message: `Add groups.tf config file`,
        content: btoa(metadata.groupTf),
        branch: branchName,
      })
      .catch(e => {
        throw new Error(
          formatHttpErrorMessage(
            `Couldn't create a commit with ${groupFileName} file added`,
            e,
          ),
        );
      });

    const projectFileName = `terraform/trivago/${metadata.pilar}/${metadata.teamName}/projects.tf`;

    await octo.repos
      .createOrUpdateFileContents({
        owner,
        repo,
        path: projectFileName,
        message: `Add groups.tf config file`,
        content: btoa(metadata.projectTf),
        branch: branchName,
      })
      .catch(e => {
        throw new Error(
          formatHttpErrorMessage(
            `Couldn't create a commit with ${projectFileName} file added`,
            e,
          ),
        );
      });

    const pullRequestRespone = await octo.pulls
      .create({
        owner,
        repo,
        title: `Add ${metadata.pilar}/${metadata.teamName}/* config file`,
        head: branchName,
        base: repoData.data.default_branch,
      })
      .catch(e => {
        throw new Error(
          formatHttpErrorMessage(
            `Couldn't create a pull request for ${branchName} branch`,
            e,
          ),
        );
      });

    const result = pullRequestRespone.data.html_url;

    return result;
  }
}

function formatHttpErrorMessage(
  message: string,
  error: { status: number; message: string },
) {
  return `${message}, received http response status code ${error.status}: ${error.message}`;
}
