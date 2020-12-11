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
  SimpleStepper,
  SimpleStepperStep,
  StructuredMetadataTable,
  SupportButton,
  identityApiRef,
  useApi,
  errorApiRef,
} from '@backstage/core';
import {
  Grid,
  TextField,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
} from '@material-ui/core';
import {
  groupsTfRender,
  networkTfRender,
  projectsTfRenderPlayground,
  projectsTfRenderStages,
} from './templates';
import { Metadata, gcpApiRef } from '../../api';
import React, { FC, useState } from 'react';
import { CreationStatus } from '../CreationStatus';

export const Project: FC<{}> = () => {
  const errorApi = useApi(errorApiRef);
  const api = useApi(gcpApiRef);
  const profile = useApi(identityApiRef).getProfile();
  const email = profile.email;

  const [modalOpen, setModalOpen] = useState(false);
  const [prLink, setPrLink] = useState<string | undefined>();
  const [projectName, setProjectName] = useState('');
  const [pilar, setPilar] = useState('');
  const [region, setRegion] = useState('playground');
  const [teamName, setTeamName] = useState('');
  const groupNamePrefix = `trv-${pilar}-${teamName}-`;
  const [projectEmail, setProjectEmail] = useState('');
  const [projectDescription, setProjectDescription] = useState(
    'Project Description',
  );
  const [vpcEnable, setVpcEnable] = useState(false);
  const [autoCreateNet, setAutoCreateNet] = useState(false);
  const [vpcSubnet, setVpcSubnet] = useState('');
  const [subnetName, setSubnetName] = useState(
    'trv-io-sre-testing-stage-eu-w4',
  );
  const [subnetRange, setSubnetRange] = useState('10.245.240.128/27');
  const [subnetRegion, setSubnetRegion] = useState('europe-west4');
  const [subnetPrivateAccess, setSubnetPrivateAccess] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDisplayName, setGroupDisplayName] = useState('');
  const [groupMembers, setGroupMembers] = useState(
    'example.member1,example.member2',
  );

  const groupMembersArray = groupMembers.split(',');

  let showMembersArray = '\t"';

  groupMembersArray.forEach(member => {
    showMembersArray = `${showMembersArray + member.trim()}",\n\t"`;
  });

  showMembersArray = showMembersArray.slice(0, -1);
  showMembersArray = showMembersArray.trimEnd();

  const projectId = projectName;

  const metadata: Metadata = {
    email: email,
    pilar: pilar,
    teamName: teamName,
    projectName: projectName,
    projectId: projectId,
    projectEmail: projectEmail,
    projectDescription: projectDescription,
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
    region: region,
    groupNamePrefix: groupNamePrefix,
    owner: 'frontdesk-development',
    repo: 'testpr',
    projectTf: '',
    groupTf: '',
    networkTf: '',
  };

  const ProjectsTfTemplate = () => {
    if (region === 'edge-stage-prod') {
      metadata.projectTf = projectsTfRenderStages(metadata);
      return (
        <textarea style={{ height: '250px', width: '100%' }} readOnly>
          {projectsTfRenderStages(metadata)}
        </textarea>
      );
    }
    metadata.projectTf = projectsTfRenderPlayground(metadata);
    return (
      <textarea
        style={{ height: '250px', width: '100%' }}
        readOnly
        value={projectsTfRenderPlayground(metadata)}
      />
    );
  };

  const NetworkTfTemplate = () => {
    metadata.networkTf = networkTfRender(metadata);
    return (
      <textarea
        style={{ height: '250px', width: '100%' }}
        readOnly
        value={networkTfRender(metadata)}
      />
    );
  };

  const GroupsTfTemplate = () => {
    metadata.groupTf = groupsTfRender(metadata);
    return (
      <textarea
        style={{ height: '250px', width: '100%' }}
        readOnly
        value={groupsTfRender(metadata)}
      />
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

  const REGION_LIST = [
    {
      label: 'Edge - Stage - Prod',
      value: 'edge-stage-prod',
    },
    {
      label: 'Playground',
      value: 'playground',
    },
  ];

  const PILAR_LIST = [
    {
      label: 'Advertiser Relations',
      value: 'advertiser-relations',
    },
    {
      label: 'Content Engineering',
      value: 'content-engineering',
    },
    {
      label: 'Data Engineering',
      value: 'data-engineering',
    },
    {
      label: 'Datacenter Operations',
      value: 'datacenter-operations',
    },
    {
      label: 'Hotel Search',
      value: 'hotel-search',
    },
    {
      label: 'Infrastructure Operations',
      value: 'io',
    },
    {
      label: 'Marketing and Design',
      value: 'mad',
    },
    {
      label: 'Marketing',
      value: 'marketing',
    },
    {
      label: 'Marketplace',
      value: 'marketplace',
    },
    {
      label: 'Organizational Productivity',
      value: 'organizational-productivity',
    },
  ];

  const onSubmit = async (metadata: Metadata) => {
    try {
      setModalOpen(true);
      setPrLink(await api.createPr(metadata));
    } catch (e) {
      errorApi.post(e);
    }
  };

  return (
    <Content>
      {modalOpen && <CreationStatus prLink={prLink} />}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <InfoCard title="Create new GCP Project">
            <SimpleStepper>
              <SimpleStepperStep title="Pilar">
                <Select
                  onChange={(e: React.ChangeEvent<any>) =>
                    setPilar(e?.target?.value)
                  }
                  variant="outlined"
                  placeholder="Pilar Name"
                  label="Default"
                  value={pilar}
                  fullWidth
                >
                  {PILAR_LIST.map((value: { label: string; value: string }) => (
                    <MenuItem value={value.value}>{value.label}</MenuItem>
                  ))}
                </Select>
              </SimpleStepperStep>
              <SimpleStepperStep title="Team Name">
                <TextField
                  variant="outlined"
                  name="teamName"
                  label="Team Name"
                  helperText="The name of team that owns the project."
                  inputProps={{ 'aria-label': 'Team Name' }}
                  onChange={e => setTeamName(e.target.value)}
                  value={teamName}
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
              <SimpleStepperStep title="Regions">
                <Select
                  onChange={(e: React.ChangeEvent<any>) =>
                    setRegion(e?.target?.value)
                  }
                  variant="outlined"
                  placeholder="Region"
                  label="Default"
                  value={region}
                  fullWidth
                >
                  {REGION_LIST.map(
                    (value: { label: string; value: string }) => (
                      <MenuItem value={value.value}>{value.label}</MenuItem>
                    ),
                  )}
                </Select>
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
              <SimpleStepperStep title="VPC enable">
                <FormControlLabel
                  id="vpcEnable"
                  name="vpcEnable"
                  control={<Switch color="primary" name="switch" />}
                  label="VPC enable"
                  labelPlacement="end"
                  onClick={handleVpcEnableClick}
                />
              </SimpleStepperStep>
              {vpcEnable && (
                <SimpleStepperStep title="VPC Subnet">
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
                </SimpleStepperStep>
              )}
              {vpcEnable && (
                <SimpleStepperStep title="Auto Network">
                  <FormControlLabel
                    id="autoNetwork"
                    name="autoNetwork"
                    control={<Switch color="primary" name="switch" />}
                    label="Auto create Network"
                    labelPlacement="end"
                    onClick={handleAutoCreateNetworkClick}
                  />
                </SimpleStepperStep>
              )}
              {vpcEnable && (
                <SimpleStepperStep title="Subnet Name">
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
                </SimpleStepperStep>
              )}
              {vpcEnable && (
                <SimpleStepperStep title="Subnet IP range">
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
                </SimpleStepperStep>
              )}
              {vpcEnable && (
                <SimpleStepperStep title="Subnet region">
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
                </SimpleStepperStep>
              )}
              {vpcEnable && (
                <SimpleStepperStep title="Subnet private Access">
                  <FormControlLabel
                    id="subnetPrivateAccess"
                    name="subnetPrivateAccess"
                    control={<Switch color="primary" name="switch" />}
                    label="Subnet private access"
                    labelPlacement="end"
                    onClick={handleSubnetPrivateAccessClick}
                  />
                </SimpleStepperStep>
              )}
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
                  nextText: 'Create',
                  onNext: () => onSubmit(metadata),
                }}
              >
                <StructuredMetadataTable metadata={metadata} />
              </SimpleStepperStep>
            </SimpleStepper>
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

export const NewProjectPage = () => (
  <Page themeId="service">
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
