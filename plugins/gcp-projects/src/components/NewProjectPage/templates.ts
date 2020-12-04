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
    projectName: string | undefined;
    projectId: string | undefined;
    projectEmail: string | undefined;
    projectDescription: string | undefined;
    projectTier: string | undefined;
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
}

export const GroupsTfRender = (metadata: metadata) => {
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

export const NetworkTfRender = (metadata: metadata) => {
    const networkTf = `   {
        subnet_name           = "${metadata.subnetName}"
        subnet_ip             = "${metadata.subnetRange}"
        subnet_region         = "${metadata.subnetRegion}"
        subnet_private_access = ${metadata.subnetPrivateAccess}
      },`;
    return networkTf;
}

export const ProjectsTfRender = (metadata: metadata) => {
    if (metadata.region == "edge-stage-prod") {

    }
}
