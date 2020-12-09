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

type metadata = {
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
};

export const groupsTfRender = (metadata: metadata) => {
  const groupMembersArray = metadata.groupMembers.split(',');

  let showMembersArray = '\t"';

  groupMembersArray.forEach((member: string) => {
    showMembersArray = `${showMembersArray + member.trim()}",\n\t"`;
  });

  showMembersArray = showMembersArray.slice(0, -1);
  showMembersArray = showMembersArray.trimEnd();

  const groupsTf = `module "group_${metadata.groupName}" { 
    source       = "../../modules/group"
    name         = "${metadata.groupName}"
    display_name = "${metadata.groupDisplayName}"
    members = [
${showMembersArray}
    ]
}`;
  return groupsTf;
};

export const networkTfRender = (metadata: metadata) => {
  const networkTf = `   {
        subnet_name           = "${metadata.subnetName}"
        subnet_ip             = "${metadata.subnetRange}"
        subnet_region         = "${metadata.subnetRegion}"
        subnet_private_access = ${metadata.subnetPrivateAccess}
      },`;
  return networkTf;
};

export const projectsTfRenderPlayground = (metadata: metadata) => {
  let projectsTfPlayground = `module "project_${metadata.groupNamePrefix
    .toLowerCase()
    .split(' ')
    .join('-')}${metadata.projectName.toLowerCase().split(' ').join('-')}" {
        source      = "../../modules/project"
        name        = "${metadata.groupNamePrefix
          .toLowerCase()
          .split(' ')
          .join('-')}${metadata.projectName.toLowerCase().split(' ').join('-')}"
        group_email = "${metadata.projectEmail}" 
        description = "${metadata.projectDescription}"
        folder      = module.folder.name
        tier        = "playground"
        shared_vpc_enabled = ${metadata.vpcEnable}`;

  if (metadata.vpcEnable) {
    projectsTfPlayground = `${projectsTfPlayground}
        shared_vpc_subnets = [
          "${metadata.subnetRegion}/${metadata.subnetName}",
        ]
        auto_create_network = ${metadata.autoNetwork}
}`;
  } else {
    projectsTfPlayground = `${projectsTfPlayground}
}`;
  }
  return projectsTfPlayground;
};

export const projectsTfRenderStages = (metadata: metadata) => {
  let projectsTfProd = `module "project_${metadata.groupNamePrefix
    .toLowerCase()
    .split(' ')
    .join('-')}${metadata.projectName
    .toLowerCase()
    .split(' ')
    .join('-')}-prod" {
        source      = "../../modules/project"
        name        = "${metadata.groupNamePrefix
          .toLowerCase()
          .split(' ')
          .join('-')}${metadata.projectName
    .toLowerCase()
    .split(' ')
    .join('-')}-prod"
        group_email = "${metadata.projectEmail}"
        description = "Prod enviroment for ${metadata.projectName}"
        folder      = module.folder.name
        tier        = "prod"
        shared_vpc_enabled = ${metadata.vpcEnable}`;

  if (metadata.vpcEnable) {
    projectsTfProd = `${projectsTfProd}
        shared_vpc_subnets = [
          "${metadata.subnetRegion}/${metadata.subnetName}",
        ]
        auto_create_network = ${metadata.autoNetwork}
}`;
  } else {
    projectsTfProd = `${projectsTfProd}
}`;
  }

  let projectsTfStage = `module "project_${metadata.groupNamePrefix
    .toLowerCase()
    .split(' ')
    .join('-')}${metadata.projectName
    .toLowerCase()
    .split(' ')
    .join('-')}-stage" {
        source      = "../../modules/project"
        name        = "${metadata.groupNamePrefix
          .toLowerCase()
          .split(' ')
          .join('-')}${metadata.projectName
    .toLowerCase()
    .split(' ')
    .join('-')}-stage"
        group_email = "${metadata.projectEmail}"
        description = "Stage enviroment for ${metadata.projectName}"
        folder      = module.folder.name
        tier        = "stage"
        shared_vpc_enabled = ${metadata.vpcEnable}`;

  if (metadata.vpcEnable) {
    projectsTfStage = `${projectsTfStage}
        shared_vpc_subnets = [
          "${metadata.subnetRegion}/${metadata.subnetName}",
        ]
        auto_create_network = ${metadata.autoNetwork}
}`;
  } else {
    projectsTfStage = `${projectsTfStage}
}`;
  }

  let projectsTfEdge = `module "project_${metadata.groupNamePrefix
    .toLowerCase()
    .split(' ')
    .join('-')}${metadata.projectName
    .toLowerCase()
    .split(' ')
    .join('-')}-edge" {
        source      = "../../modules/project"
        name        = "${metadata.groupNamePrefix
          .toLowerCase()
          .split(' ')
          .join('-')}${metadata.projectName
    .toLowerCase()
    .split(' ')
    .join('-')}-edge"
        group_email = "${metadata.projectEmail}"
        description = "Edge env for ${metadata.projectName}"
        folder      = module.folder.name
        tier        = "edge"
        shared_vpc_enabled = ${metadata.vpcEnable}`;

  if (metadata.vpcEnable) {
    projectsTfEdge = `${projectsTfEdge}
        shared_vpc_subnets = [
          "${metadata.subnetRegion}/${metadata.subnetName}",
        ]
        auto_create_network = ${metadata.autoNetwork}
}`;
  } else {
    projectsTfEdge = `${projectsTfEdge}
}`;
  }

  const projectsTfStages = `${projectsTfProd}
    
${projectsTfStage}
    
${projectsTfEdge}`;

  return projectsTfStages;
};
