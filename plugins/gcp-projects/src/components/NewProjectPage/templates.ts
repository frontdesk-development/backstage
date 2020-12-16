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

export const subnetsTfRender = (metadata: Metadata) => {
  const completeProjectName =
    metadata.groupNamePrefix.toLowerCase().split(' ').join('-') +
    metadata.projectName.toLowerCase().split(' ').join('-');
  const subnetsTf = `module "subnet_${completeProjectName}-play-eu-w4" {
    source      = "../../../modules/subnet"
    cidr_range  = "X.X.X.X/XX"
    region      = "europe-west4"
    name        = "${completeProjectName}-play-eu-w4"
    description = <<DESC
  This subnet contains the PLAYGROUND infrastructure for the ${metadata.pilar}-${metadata.teamName} ${metadata.projectName} project
  DESC
}`;
  return subnetsTf;
};

export const projectsTfRenderPlayground = (metadata: Metadata) => {
  const completeProjectName =
    metadata.groupNamePrefix.toLowerCase().split(' ').join('-') +
    metadata.projectName.toLowerCase().split(' ').join('-');
  const projectsTfPlayground = `module "project_${completeProjectName}" {
        source      = "../../modules/project"
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

export const projectsTfRenderStages = (metadata: Metadata) => {
  const completeProjectName =
    metadata.groupNamePrefix.toLowerCase().split(' ').join('-') +
    metadata.projectName.toLowerCase().split(' ').join('-');
  const projectsTfProd = `module "project_${completeProjectName}-prod" {
        source      = "../../modules/project"
        name        = "${completeProjectName}-prod"
        group_email = "${metadata.groupEmail}"
        description = "Prod enviroment for ${metadata.projectName}"
        folder      = module.folder.name
        tier        = "prod"
        shared_vpc_enabled = true
        shared_vpc_subnets = [
          "",
        ]
        auto_create_network = false
}`;

  const projectsTfStage = `module "project_${completeProjectName}-stage" {
        source      = "../../modules/project"
        name        = "${completeProjectName}-stage"
        group_email = "${metadata.groupEmail}"
        description = "Stage enviroment for ${metadata.projectName}"
        folder      = module.folder.name
        tier        = "stage"
        shared_vpc_enabled = true
        shared_vpc_subnets = [
          "",
        ]
        auto_create_network = false
}`;

  const projectsTfEdge = `module "project_${completeProjectName}-edge" {
        source      = "../../modules/project"
        name        = "${completeProjectName}-edge"
        group_email = "${metadata.groupEmail}"
        description = "Edge env for ${metadata.projectName}"
        folder      = module.folder.name
        tier        = "edge"
        shared_vpc_enabled = true
        shared_vpc_subnets = [
          "",
        ]
        auto_create_network = false
}`;

  const projectsTfStages = `${projectsTfProd}
    
${projectsTfStage}
    
${projectsTfEdge}`;

  return projectsTfStages;
};
