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
  Content,
  ContentHeader,
  Header,
  HeaderLabel,
  InfoCard,
  Page,
  pageTheme,
  SimpleStepper,
  SimpleStepperStep,
  StructuredMetadataTable,
  SupportButton,
} from '@backstage/core';
import {
  Button,
  Grid,
  TextField,
  FormControlLabel,
  Switch,
} from '@material-ui/core';
import React, { useState } from 'react';

export const Project = () => {
  const [projectName, setProjectName] = useState('ProjectName');
  const [projectEmail, setProjectEmail] = useState('projectEmail@trivago.com');
  const [projectDescription, setProjectDescription] = useState(
    'Project Description',
  );
  const [projectTier, setProjectTier] = useState('stage');
  const [vpcEnable, setVpcEnable] = useState(false);
  const [autoCreateNet, setAutoCreateNet] = useState(false);
  const [vpcSubnet, setVpcSubnet] = useState('');
  const [subnetName, setSubnetName] = useState(
    'trv-io-sre-testing-stage-eu-w4',
  );
  const [subnetRange, setSubnetRange] = useState('10.245.240.128/27');
  const [subnetRegion, setSubnetRegion] = useState('europe-west4');
  const [subnetPrivateAccess, setSubnetPrivateAccess] = useState(false);
  const [groupName, setGroupName] = useState('{group-name}');
  const [groupDisplayName, setGroupDisplayName] = useState(
    '{Group Display Name}',
  );
  const [groupMembers, setGroupMembers] = useState(
    'example.member1,example.member2',
  );

  const [projectId, setProjectId] = useState('');
  const [disabled, setDisabled] = useState(true);

  const groupMembersArray = groupMembers.split(',');

  let showMembersArray = '\t"';

  groupMembersArray.forEach(member => {
    showMembersArray = `${showMembersArray + member.trim()}",\n\t"`;
  });

  showMembersArray = showMembersArray.slice(0, -1);
  showMembersArray = showMembersArray.trimEnd();

  const groupsTf = `module "group_${groupName}" { 
    source       = "../../modules/group"
    name         = "${groupName}"
    display_name = "${groupDisplayName}"
    members = [
${showMembersArray}
    ]
  }`;

  let projectsTf = `module "project_${projectName}" {
    source      = "../../modules/project"
    name        = "${projectName}"
    group_email = "${projectEmail}"
    description = "${projectDescription}"
    folder      = module.folder.name
    tier        = "${projectTier}"
    shared_vpc_enabled = ${vpcEnable}
`;

  if (vpcEnable) {
    projectsTf = `${projectsTf}
    shared_vpc_subnets = [
      "${subnetRegion}/${subnetName}",
    ]
    auto_create_network = ${autoCreateNet}
  }`;
  } else {
    projectsTf = `${projectsTf}
  }`;
  }

  const networkTf = `   {
    subnet_name           = "${subnetName}"
    subnet_ip             = "${subnetRange}"
    subnet_region         = "${subnetRegion}"
    subnet_private_access = ${subnetPrivateAccess}
  },`;

  const GroupsTfTemplate = () => {
    return (
      <textarea style={{ height: '250px', width: '100%' }} readOnly>
        {groupsTf}
      </textarea>
    );
  };

  const ProjectsTfTemplate = () => {
    return (
      <textarea style={{ height: '250px', width: '100%' }} readOnly>
        {projectsTf}
      </textarea>
    );
  };

  const NetworkTfTemplate = () => {
    return (
      <textarea style={{ height: '250px', width: '100%' }} readOnly>
        {networkTf}
      </textarea>
    );
  };

  const handleVpcEnableClick = () => {
    if (vpcEnable) {
      setVpcEnable(false);
    } else {
      setVpcEnable(true);
    }
  };

  const handleAutoCreateNetworkClick = () => {
    if (autoCreateNet) {
      setAutoCreateNet(false);
    } else {
      setAutoCreateNet(true);
    }
  };

  const handleSubnetPrivateAccessClick = () => {
    if (subnetPrivateAccess) {
      setSubnetPrivateAccess(false);
    } else {
      setSubnetPrivateAccess(true);
    }
  };

  const metadata = {
    ProjectName: projectName,
    ProjectId: projectId,
    projectEmail: projectEmail,
    projectDescription: projectDescription,
    projectTier: projectTier,
    vpcEnable: String(vpcEnable),
    vpcSubnet: vpcSubnet,
    autoNetwork: String(autoCreateNet),
    subnetName: subnetName,
    subnetRange: subnetRange,
    subnetRegion: subnetRegion,
    subnetPrivateAccess: String(subnetPrivateAccess),
    groupName: groupName,
    groupDisplayName: groupDisplayName,
    groupMembers: groupMembers,
  };

  return (
    <Content>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <InfoCard title="Create new GCP Project">
            <SimpleStepper>
              <SimpleStepperStep title="Project ID">
                <TextField
                  variant="outlined"
                  name="projectId"
                  label="projectId"
                  onChange={e => setProjectId(e.target.value)}
                  value={projectId}
                  fullWidth
                />
              </SimpleStepperStep>
              <SimpleStepperStep title="Project Name">
                <TextField
                  variant="outlined"
                  name="projectName"
                  label="Project Name"
                  helperText="The name of the new project."
                  inputProps={{ 'aria-label': 'Project Name' }}
                  onChange={e => setProjectName(e.target.value)}
                  value={projectName}
                  fullWidth
                />
              </SimpleStepperStep>
              <SimpleStepperStep title="Project Email">
                <TextField
                  variant="outlined"
                  name="projectEmail"
                  label="Project Email"
                  helperText="The email for the new project."
                  inputProps={{ 'aria-label': 'Project Email' }}
                  onChange={e => setProjectEmail(e.target.value)}
                  value={projectEmail}
                  fullWidth
                />
              </SimpleStepperStep>
              <SimpleStepperStep title="Project Description">
                <TextField
                  variant="outlined"
                  name="projectDescription"
                  label="Project Description"
                  helperText="The description for the new project."
                  inputProps={{ 'aria-label': 'Project Description' }}
                  onChange={e => setProjectDescription(e.target.value)}
                  value={projectDescription}
                  fullWidth
                />
              </SimpleStepperStep>
              <SimpleStepperStep title="Project tier">
                <TextField
                  variant="outlined"
                  name="projectTier"
                  label="Project Tier"
                  helperText="The Tier for the new project."
                  inputProps={{ 'aria-label': 'Project Tier' }}
                  onChange={e => setProjectTier(e.target.value)}
                  value={projectTier}
                  fullWidth
                />
              </SimpleStepperStep>
              <SimpleStepperStep title="VPC enable">
                <FormControlLabel
                  id="vpcEnable"
                  name="vpcEnable"
                  control={<Switch color="primary" name="switch" />}
                  label="VPC enable"
                  labelPlacement="end"
                  onClick={handleVpcEnableClick}
                />
                {vpcEnable && (
                  <>
                    <TextField
                      variant="outlined"
                      name="vpcSubnet"
                      label="VPC Subnet"
                      helperText="The VPC subnet for the new project."
                      inputProps={{ 'aria-label': 'VPC Subnet' }}
                      onChange={e => setVpcSubnet(e.target.value)}
                      value={vpcSubnet}
                      fullWidth
                    />
                    <FormControlLabel
                      id="autoNetwork"
                      name="autoNetwork"
                      control={<Switch color="primary" name="switch" />}
                      label="Auto create Network"
                      labelPlacement="end"
                      onClick={handleAutoCreateNetworkClick}
                    />
                    <TextField
                      variant="outlined"
                      name="subnetName"
                      label="Subnet Name"
                      helperText="The subnet name for the new project."
                      inputProps={{ 'aria-label': 'Subnet Name' }}
                      onChange={e => setSubnetName(e.target.value)}
                      value={subnetName}
                      fullWidth
                    />
                    <TextField
                      variant="outlined"
                      name="subnetRange"
                      label="Subnet IP Range"
                      helperText="The subnet IP range for the new project."
                      inputProps={{ 'aria-label': 'Subnet IP Range' }}
                      onChange={e => setSubnetRange(e.target.value)}
                      value={subnetRange}
                      fullWidth
                    />
                    <TextField
                      variant="outlined"
                      name="subnetRegion"
                      label="Subnet Region"
                      helperText="The subnet Region for the new project."
                      inputProps={{ 'aria-label': 'Subnet Region' }}
                      onChange={e => setSubnetRegion(e.target.value)}
                      value={subnetRegion}
                      fullWidth
                    />
                    <FormControlLabel
                      id="subnetPrivateAccess"
                      name="subnetPrivateAccess"
                      control={<Switch color="primary" name="switch" />}
                      label="Subnet private access"
                      labelPlacement="end"
                      onClick={handleSubnetPrivateAccessClick}
                    />
                  </>
                )}
              </SimpleStepperStep>
              <SimpleStepperStep title="Group Name">
                <TextField
                  variant="outlined"
                  name="groupName"
                  label="Group Name"
                  helperText="The group name for the new project."
                  inputProps={{ 'aria-label': 'Group Name' }}
                  onChange={e => setGroupName(e.target.value)}
                  value={groupName}
                  fullWidth
                />
              </SimpleStepperStep>
              <SimpleStepperStep title="Group Display Name">
                <TextField
                  variant="outlined"
                  name="groupDisplayName"
                  label="Group Display Name"
                  helperText="The group display name for the new project."
                  inputProps={{ 'aria-label': 'Group Display Name' }}
                  onChange={e => setGroupDisplayName(e.target.value)}
                  value={groupDisplayName}
                  fullWidth
                />
              </SimpleStepperStep>
              <SimpleStepperStep title="Group Members">
                <TextField
                  variant="outlined"
                  name="groupMembers"
                  label="Group Members"
                  helperText="The group members for the new project."
                  inputProps={{ 'aria-label': 'Group Members' }}
                  onChange={e => setGroupMembers(e.target.value)}
                  value={groupMembers}
                  fullWidth
                />
              </SimpleStepperStep>
              <SimpleStepperStep
                title="Review"
                actions={{
                  nextText: 'Confirm',
                  onNext: () => setDisabled(false),
                }}
              >
                <StructuredMetadataTable metadata={metadata} />
              </SimpleStepperStep>
            </SimpleStepper>
            <Button
              variant="text"
              data-testid="cancel-button"
              color="primary"
              href="/gcp-projects"
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              disabled={disabled}
              href={`newProject?projectName=${encodeURIComponent(
                projectName,
              )},projectId=${encodeURIComponent(projectId)}`} // Need to extend this to add all the fields.
            >
              Create
            </Button>
          </InfoCard>
        </Grid>
        <Grid item xs={6} md={6}>
          <InfoCard title="projects.tf">
            <ProjectsTfTemplate />
          </InfoCard>
          <br />
          <InfoCard title="groups.tf">
            <GroupsTfTemplate />
          </InfoCard>
          <br />
          {vpcEnable && (
            <InfoCard title="networks.tf">
              <NetworkTfTemplate />
            </InfoCard>
          )}
        </Grid>
      </Grid>
    </Content>
  );
};

const labels = (
  <>
    <HeaderLabel label="Owner" value="Spotify" />
    <HeaderLabel label="Lifecycle" value="Production" />
  </>
);

export const NewProjectPage = () => {
  return (
    <Page theme={pageTheme.service}>
      <Header title="New GCP Project" type="tool">
        {labels}
      </Header>
      <Content>
        <ContentHeader title="">
          <SupportButton>
            This plugin allows you to view and interact with your gcp projects.
          </SupportButton>
        </ContentHeader>
        <Project />
      </Content>
    </Page>
  );
};
