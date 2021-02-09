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

    const subnetsFileName = `terraform/trivago/${metadata.pillar}/${metadata.teamName}/subnets.tf`;

    const subnetsResponse = await octo.repos
      .getContent({
        owner: metadata.owner,
        repo: metadata.repo,
        path: subnetsFileName,
      })
      .catch(() => {});

    let subnetsTf: string = '';
    let subnetsSha: string = '';
    if (subnetsResponse) {
      if (subnetsResponse?.status === 200) {
        // const subnetsContent = Buffer.from(
        //   subnetsResponse.data.content,
        //   'base64',
        // ).toString();
        const subnetsContent = '';
        subnetsTf = `${subnetsContent}\n\n${metadata.subnetsTf}`;
        // subnetsSha = subnetsResponse.sha;
        subnetsSha = '';
      } else {
        subnetsTf = metadata.subnetsTf;
      }
    } else {
      subnetsTf = metadata.subnetsTf;
    }

    await octo.repos
      .createOrUpdateFileContents({
        owner,
        repo,
        path: subnetsFileName,
        message: `Add subnets.tf config file`,
        content: btoa(subnetsTf),
        branch: branchName,
        sha: subnetsSha,
      })
      .catch(e => {
        throw new Error(
          formatHttpErrorMessage(
            `Couldn't create a commit with ${subnetsFileName} file added`,
            e,
          ),
        );
      });

    if (metadata.groupName !== '') {
      const groupsFileName = `terraform/trivago/${metadata.pillar}/${metadata.teamName}/groups.tf`;

      const groupsResponse = await octo.repos
        .getContent({
          owner: metadata.owner,
          repo: metadata.repo,
          path: groupsFileName,
        })
        .catch(() => {});

      let groupsTf: string = '';
      let groupsSha: string = '';
      if (groupsResponse) {
        if (groupsResponse?.status === 200) {
          // const groupsContent = Buffer.from(
          //   groupsResponse.data.content,
          //   'base64',
          // ).toString();
          const groupsContent = '';
          groupsTf = `${groupsContent}\n\n${metadata.groupsTf}`;
          // groupsSha = groupsResponse.data.sha;
          groupsSha = '';
        } else {
          groupsTf = metadata.groupsTf;
        }
      } else {
        groupsTf = metadata.groupsTf;
      }

      await octo.repos
        .createOrUpdateFileContents({
          owner,
          repo,
          path: groupsFileName,
          message: `Add groups.tf config file`,
          content: btoa(groupsTf),
          branch: branchName,
          sha: groupsSha,
        })
        .catch(e => {
          throw new Error(
            formatHttpErrorMessage(
              `Couldn't create a commit with ${groupsFileName} file added`,
              e,
            ),
          );
        });
    }

    const projectFileName = `terraform/trivago/${metadata.pillar}/${metadata.teamName}/projects.tf`;

    const projectResponse = await octo.repos
      .getContent({
        owner: metadata.owner,
        repo: metadata.repo,
        path: projectFileName,
      })
      .catch(() => {});

    let projectTf: string = '';
    let projectSha: string = '';
    if (projectResponse) {
      if (projectResponse.status === 200) {
        // const projectContent = Buffer.from(
        //   projectResponse.data.content,
        //   'base64',
        // ).toString();
        const projectContent = '';
        projectTf = `${projectContent}\n\n${metadata.projectTf}`;
        // projectSha = projectResponse.data.sha;
        projectSha = '';
      } else {
        projectTf = metadata.projectTf;
      }
    } else {
      projectTf = metadata.projectTf;
    }

    await octo.repos
      .createOrUpdateFileContents({
        owner,
        repo,
        path: projectFileName,
        message: `Add groups.tf config file`,
        content: btoa(projectTf),
        branch: branchName,
        sha: projectSha,
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
        title: `Add ${metadata.pillar}/${metadata.teamName}/* config file`,
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
