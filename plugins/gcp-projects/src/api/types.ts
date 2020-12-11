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

export type Project = {
  name: string;
  projectNumber?: string;
  projectId: string;
  lifecycleState?: string;
  createTime?: string;
};

export type ProjectDetails = {
  details: string;
};

export type Operation = {
  name: string;
  metadata: string;
  done: boolean;
  error: Status;
  response: string;
};

export type Status = {
  code: number;
  message: string;
  details: string[];
};

export type Metadata = {
  email: string | undefined;
  pilar: string | undefined;
  teamName: string | undefined;
  projectName: string;
  projectId: string | undefined;
  projectEmail: string | undefined;
  projectDescription: string | undefined;
  vpcEnable: string | undefined;
  vpcSubnet: string | undefined;
  autoNetwork: string | undefined;
  subnetName: string | undefined;
  subnetRange: string | undefined;
  subnetRegion: string | undefined;
  subnetPrivateAccess: string | undefined;
  groupName: string | undefined;
  groupDisplayName: string | undefined;
  groupMembers: string;
  region: string | undefined;
  groupNamePrefix: string;
  owner: string;
  repo: string;
  projectTf: string;
  groupTf: string;
  networkTf: string;
};

export type Templates = {
  path: string;
  content: string;
};
