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
  userEmail: string | undefined;
  email: string | undefined;
  pillar: string | undefined;
  teamName: string | undefined;
  groupName: string | undefined;
  groupMembers: string | undefined;
  groupDisplayName: string | undefined;
  projectName: string;
  projectId: string | undefined;
  groupEmail: string | undefined;
  projectDescription: string | undefined;
  environment: string | undefined;
  groupNamePrefix: string;
  owner: string;
  repo: string;
  projectTf: string;
  subnetsTf: string;
  groupsTf: string;
};

export type Templates = {
  path: string;
  content: string;
};
