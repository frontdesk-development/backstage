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

import { Metadata } from '../../api/types';

export const subnetsTfRenderPlayground = (metadata: Metadata) => {
  const completeProjectName =
    metadata.groupNamePrefix.toLowerCase().split(' ').join('-') +
    metadata.projectName.toLowerCase().split(' ').join('-');
  const subnetsTf = `module "subnet_${completeProjectName}-play-eu-w4" {
    source      = "../../../modules/subnet"
    cidr_range  = "X.X.X.X/XX"
    region      = "europe-west4"
    name        = "${completeProjectName}-play-eu-w4"
    description = <<DESC
  This subnet contains the PLAYGROUND infrastructure for the ${metadata.pillar}-${metadata.teamName} ${metadata.projectName} project
  DESC
}`;
  return subnetsTf;
};

export const projectsTfRenderPlayground = (metadata: Metadata) => {
  const completeProjectName =
    metadata.groupNamePrefix.toLowerCase().split(' ').join('-') +
    metadata.projectName.toLowerCase().split(' ').join('-');
  const projectsTfPlayground = `module "project_${completeProjectName}" {
        source      = "../../../modules/project"
        name        = "${metadata.groupNamePrefix
          .toLowerCase()
          .split(' ')
          .join('-')}${metadata.projectName.toLowerCase().split(' ').join('-')}"
        group_email = "${metadata.groupEmail}" 
        description = "${metadata.projectDescription}"
        folder      = module.folder.name
        tier        = "playground"
        shared_vpc_enabled = true
        shared_vpc_subnets = [
          "europe-west4/${completeProjectName}-play-eu-w4",  
        ]
        auto_create_network = false
        depends_on = [
          module.subnet_${completeProjectName}-play-eu-w4,
        ]
}`;
  return projectsTfPlayground;
};

export const groupsTfRender = (metadata: Metadata) => {
  const members = metadata.groupMembers?.split(',');
  let showMembersArray = '\t"';
  members?.forEach(member => {
    showMembersArray = `${showMembersArray + member.trim()}",\n\t"`;
  });
  showMembersArray = showMembersArray.slice(0, -1);
  showMembersArray = showMembersArray.trimEnd();

  const groupsTf = `module "group_team-${metadata.pillar}-${
    metadata.teamName
  }" {
    source       = "../../../modules/group"
    name         = "${metadata.groupName?.toLowerCase().split(' ').join('-')}"
    display_name = "${metadata.groupDisplayName}"
    members = [
${showMembersArray}
    ]
  }`;
  return groupsTf;
};

export const projectsTfRenderStagesEu = (metadata: Metadata) => {
  const completeProjectName =
    metadata.groupNamePrefix.toLowerCase().split(' ').join('-') +
    metadata.projectName.toLowerCase().split(' ').join('-');
  const projectsTfProd = `module "project_${completeProjectName}-prod" {
    source      = "../../../modules/project"
    name        = "${completeProjectName}-prod"
    group_email = "${metadata.groupEmail}"
    description = "Prod enviroment for ${metadata.projectName}"
    folder      = module.folder.name
    tier        = "prod"
    shared_vpc_enabled = true
    shared_vpc_subnets = [
      "europe-west4/${completeProjectName}-prod-eu-w4",
    ]
    auto_create_network = false
    depends_on = [
      module.subnet_${completeProjectName}-prod-eu-w4,
    ]
}`;

  const projectsTfStage = `module "project_${completeProjectName}-stage" {
    source      = "../../../modules/project"
    name        = "${completeProjectName}-stage"
    group_email = "${metadata.groupEmail}"
    description = "Stage enviroment for ${metadata.projectName}"
    folder      = module.folder.name
    tier        = "stage"
    shared_vpc_enabled = true
    shared_vpc_subnets = [
      "europe-west4/${completeProjectName}-stage-eu-w4",
    ]
    auto_create_network = false
    depends_on = [
      module.subnet_${completeProjectName}-stage-eu-w4,
    ]
}`;

  const projectsTfEdge = `module "project_${completeProjectName}-edge" {
    source      = "../../../modules/project"
    name        = "${completeProjectName}-edge"
    group_email = "${metadata.groupEmail}"
    description = "Edge env for ${metadata.projectName}"
    folder      = module.folder.name
    tier        = "edge"
    shared_vpc_enabled = true
    shared_vpc_subnets = [
      "europe-west4/${completeProjectName}-edge-eu-w4"
    ]
    auto_create_network = false
    depends_on = [
      module.subnet_${completeProjectName}-edge-eu-w4,
    ]
}`;

  const projectsTfStagesEu = `${projectsTfProd}
    
${projectsTfStage}
    
${projectsTfEdge}`;

  return projectsTfStagesEu;
};

export const subnetsTfRenderEu = (metadata: Metadata) => {
  const completeProjectName =
    metadata.groupNamePrefix.toLowerCase().split(' ').join('-') +
    metadata.projectName.toLowerCase().split(' ').join('-');

  const subnetsTfProd = `module "subnet_${completeProjectName}-prod-eu-w4" {
    source      = "../../../modules/subnet"
    cidr_range  = "X.X.X.X/XX"
    region      = "europe-west4"
    name        = "${completeProjectName}-prod-eu-w4"
    description = <<DESC
  This subnet contains the PROD infrastructure for the ${metadata.pillar}-${metadata.teamName} ${metadata.projectName} project
  DESC
}`;

  const subnetsTfStage = `module "subnet_${completeProjectName}-stage-eu-w4" {
  source      = "../../../modules/subnet"
  cidr_range  = "X.X.X.X/XX"
  region      = "europe-west4"
  name        = "${completeProjectName}-stage-eu-w4"
  description = <<DESC
This subnet contains the STAGE infrastructure for the ${metadata.pillar}-${metadata.teamName} ${metadata.projectName} project
DESC
}`;

  const subnetsTfEdge = `module "subnet_${completeProjectName}-edge-eu-w4" {
  source      = "../../../modules/subnet"
  cidr_range  = "X.X.X.X/XX"
  region      = "europe-west4"
  name        = "${completeProjectName}-edge-eu-w4"
  description = <<DESC
This subnet contains the EDGE infrastructure for the ${metadata.pillar}-${metadata.teamName} ${metadata.projectName} project
DESC
}`;

  const subnetsTfEu = `${subnetsTfProd}
    
${subnetsTfStage}
      
${subnetsTfEdge}`;

  return subnetsTfEu;
};

export const projectsTfRenderStagesAll = (metadata: Metadata) => {
  const completeProjectName =
    metadata.groupNamePrefix.toLowerCase().split(' ').join('-') +
    metadata.projectName.toLowerCase().split(' ').join('-');
  const projectsTfProd = `module "project_${completeProjectName}-prod" {
        source      = "../../../modules/project"
        name        = "${completeProjectName}-prod"
        group_email = "${metadata.groupEmail}"
        description = "Prod enviroment for ${metadata.projectName}"
        folder      = module.folder.name
        tier        = "prod"
        shared_vpc_enabled = true
        shared_vpc_subnets = [
          "europe-west4/${completeProjectName}-prod-eu-w4",
          "us-central1/${completeProjectName}-prod-us-c1",
          "asia-east1/${completeProjectName}-prod-as-e1",
        ]
        auto_create_network = false
        depends_on = [
          module.subnet_${completeProjectName}-prod-eu-w4,
          module.subnet_${completeProjectName}-prod-us-c1,
          module.subnet_${completeProjectName}-prod-as-e1,
        ]
}`;

  const projectsTfStage = `module "project_${completeProjectName}-stage" {
        source      = "../../../modules/project"
        name        = "${completeProjectName}-stage"
        group_email = "${metadata.groupEmail}"
        description = "Stage enviroment for ${metadata.projectName}"
        folder      = module.folder.name
        tier        = "stage"
        shared_vpc_enabled = true
        shared_vpc_subnets = [
          "europe-west4/${completeProjectName}-stage-eu-w4",
        ]
        auto_create_network = false
        depends_on = [
          module.subnet_${completeProjectName}-stage-eu-w4,
        ]
}`;

  const projectsTfEdge = `module "project_${completeProjectName}-edge" {
        source      = "../../../modules/project"
        name        = "${completeProjectName}-edge"
        group_email = "${metadata.groupEmail}"
        description = "Edge env for ${metadata.projectName}"
        folder      = module.folder.name
        tier        = "edge"
        shared_vpc_enabled = true
        shared_vpc_subnets = [
          "europe-west4/${completeProjectName}-edge-eu-w4"
        ]
        auto_create_network = false
        depends_on = [
          module.subnet_${completeProjectName}-edge-eu-w4,
        ]
}`;

  const projectsTfStagesAll = `${projectsTfProd}
    
${projectsTfStage}
    
${projectsTfEdge}`;

  return projectsTfStagesAll;
};

export const subnetsTfRenderAll = (metadata: Metadata) => {
  const completeProjectName =
    metadata.groupNamePrefix.toLowerCase().split(' ').join('-') +
    metadata.projectName.toLowerCase().split(' ').join('-');

  const subnetsTfProdEu = `module "subnet_${completeProjectName}-prod-eu-w4" {
    source      = "../../../modules/subnet"
    cidr_range  = "X.X.X.X/XX"
    region      = "europe-west4"
    name        = "${completeProjectName}-prod-eu-w4"
    description = <<DESC
  This subnet contains the PROD infrastructure for the ${metadata.pillar}-${metadata.teamName} ${metadata.projectName} project
  DESC
}`;

  const subnetsTfProdUs = `module "subnet_${completeProjectName}-prod-us-c1" {
  source      = "../../../modules/subnet"
  cidr_range  = "X.X.X.X/XX"
  region      = "us-central1"
  name        = "${completeProjectName}-prod-us-c1"
  description = <<DESC
This subnet contains the PROD infrastructure for the ${metadata.pillar}-${metadata.teamName} ${metadata.projectName} project
DESC
}`;

  const subnetsTfProdAs = `module "subnet_${completeProjectName}-prod-as-e1" {
  source      = "../../../modules/subnet"
  cidr_range  = "X.X.X.X/XX"
  region      = "asia-east1"
  name        = "${completeProjectName}-prod-as-e1"
  description = <<DESC
This subnet contains the PROD infrastructure for the ${metadata.pillar}-${metadata.teamName} ${metadata.projectName} project
DESC
}`;

  const subnetsTfStage = `module "subnet_${completeProjectName}-stage-eu-w4" {
  source      = "../../../modules/subnet"
  cidr_range  = "X.X.X.X/XX"
  region      = "europe-west4"
  name        = "${completeProjectName}-stage-eu-w4"
  description = <<DESC
This subnet contains the STAGE infrastructure for the ${metadata.pillar}-${metadata.teamName} ${metadata.projectName} project
DESC
}`;

  const subnetsTfEdge = `module "subnet_${completeProjectName}-edge-eu-w4" {
  source      = "../../../modules/subnet"
  cidr_range  = "X.X.X.X/XX"
  region      = "europe-west4"
  name        = "${completeProjectName}-edge-eu-w4"
  description = <<DESC
This subnet contains the EDGE infrastructure for the ${metadata.pillar}-${metadata.teamName} ${metadata.projectName} project
DESC
}`;

  const subnetsTfAll = `${subnetsTfProdEu}

${subnetsTfProdUs}

${subnetsTfProdAs}
    
${subnetsTfStage}
      
${subnetsTfEdge}`;

  return subnetsTfAll;
};
