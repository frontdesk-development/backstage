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
  SupportButton,
  identityApiRef,
  useApi,
  errorApiRef,
  configApiRef,
  StructuredMetadataTable,
} from '@backstage/core';
import {
  Grid,
  TextField,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  List,
  ListItem,
} from '@material-ui/core';
import {
  groupsTfRender,
  subnetsTfRenderEu,
  subnetsTfRenderAll,
  subnetsTfRenderPlayground,
  projectsTfRenderPlayground,
  projectsTfRenderStagesEu,
  projectsTfRenderStagesAll,
} from './templates';
import { Metadata, gcpApiRef } from '../../api';
import React, { FC, useState } from 'react';
import { CreationStatus } from '../CreationStatus';

export const Project: FC<{}> = () => {
  const configApi = useApi(configApiRef);
  const gcpConfig = configApi.getOptionalConfig('gcpProjects');
  const owner = gcpConfig?.getString('owner') ?? 'owner';
  const repo = gcpConfig?.getString('repo') ?? 'repo';
  const errorApi = useApi(errorApiRef);
  const api = useApi(gcpApiRef);
  const profile = useApi(identityApiRef).getProfile();
  const email = profile.email;

  const [modalOpen, setModalOpen] = useState(false);
  const [prLink, setPrLink] = useState<string | undefined>();
  const [projectName, setProjectName] = useState('');
  const [pillar, setpillar] = useState('pillar');
  const [environment, setEnvironment] = useState('playground');
  const [teamName, setTeamName] = useState('');
  const groupNamePrefix = `trv-${pillar}-${teamName}-`;
  const [groupEmail, setGroupEmail] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [createGroup, setCreateGroup] = useState(Boolean);
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState('');
  const [groupDisplayName, setGroupDisplayName] = useState('');

  const projectId = projectName;

  const metadata: Metadata = {
    userEmail: profile.email,
    email: email,
    pillar: pillar,
    teamName: teamName,
    groupName: groupName,
    groupMembers: groupMembers,
    groupDisplayName: groupDisplayName,
    projectName: projectName,
    projectId: projectId,
    groupEmail: groupEmail,
    projectDescription: projectDescription,
    environment: environment,
    groupNamePrefix: groupNamePrefix,
    owner: owner,
    repo: repo,
    projectTf: '',
    subnetsTf: '',
    groupsTf: '',
  };

  if (createGroup) {
    metadata.groupsTf = groupsTfRender(metadata);
    metadata.groupEmail = `group_team-${metadata.pillar}-${metadata.teamName}@trivago.com`;
  }

  // Render projects.tf
  if (environment === 'edge-stage-prod-eu') {
    metadata.projectTf = projectsTfRenderStagesEu(metadata);
  } else if (environment === 'edge-stage-prod-all') {
    metadata.projectTf = projectsTfRenderStagesAll(metadata);
  } else {
    metadata.projectTf = projectsTfRenderPlayground(metadata);
  }

  // Render subnets.tf
  if (environment === 'edge-stage-prod-eu') {
    metadata.subnetsTf = subnetsTfRenderEu(metadata);
  } else if (environment === 'edge-stage-prod-all') {
    metadata.subnetsTf = subnetsTfRenderAll(metadata);
  } else {
    metadata.subnetsTf = subnetsTfRenderPlayground(metadata);
  }

  const info = (partialMetadata: Partial<Metadata>) => {
    // const partialMetadata: Partial<Metadata> = {};
    partialMetadata.userEmail = metadata.userEmail;
    partialMetadata.pillar = metadata.pillar;
    partialMetadata.teamName = metadata.teamName;

    if (metadata.groupName !== '') {
      partialMetadata.groupName = metadata.groupName;
      partialMetadata.groupMembers = metadata.groupMembers;
      partialMetadata.groupDisplayName = metadata.groupDisplayName;
    } else {
      partialMetadata.email = metadata.email;
    }

    partialMetadata.projectName = metadata.projectName;
    partialMetadata.projectId = metadata.projectId;
    partialMetadata.groupEmail = metadata.groupEmail;
    partialMetadata.projectDescription = metadata.projectDescription;
    partialMetadata.environment = metadata.environment;

    return <StructuredMetadataTable metadata={partialMetadata} />;
  };

  const ENV_LIST = [
    {
      label: 'Edge-Stage-Prod (Europe Only)',
      value: 'edge-stage-prod-eu',
    },
    {
      label: 'Edge-Stage-Prod (All Regions)',
      value: 'edge-stage-prod-all',
    },
    {
      label: 'Playground (Europe)',
      value: 'playground',
    },
  ];

  const PILLAR_LIST = [
    {
      label: 'Pillar Name',
      value: 'pillar',
    },
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

  const onSubmit = async (submitMetadata: Metadata) => {
    try {
      setModalOpen(true);
      setPrLink(await api.createPr(submitMetadata));
    } catch (e) {
      errorApi.post(e);
    }
  };

  const handleGroupClick = () => {
    if (createGroup === false) {
      setCreateGroup(true);
    } else {
      setCreateGroup(false);
    }
  };

  return (
    <Content>
      {modalOpen && <CreationStatus prLink={prLink} />}
      <Grid container spacing={3}>
        <Grid item xs={12} md={12}>
          <InfoCard title="Create new GCP Project">
            <SimpleStepper>
              <SimpleStepperStep title="Organizational information">
                <>
                  <List>
                    <ListItem>
                      <Select
                        onChange={(e: React.ChangeEvent<any>) =>
                          setpillar(e?.target?.value)
                        }
                        value={pillar}
                        fullWidth
                      >
                        {PILLAR_LIST.map(
                          (value: { label: string; value: string }) => (
                            <MenuItem value={value.value}>
                              {value.label}
                            </MenuItem>
                          ),
                        )}
                      </Select>
                    </ListItem>
                    <ListItem title="Team Name">
                      <TextField
                        name="teamName"
                        label="Team Name"
                        helperText="The name of team that owns the project."
                        inputProps={{ 'aria-label': 'Team Name' }}
                        onChange={e => setTeamName(e.target.value)}
                        value={teamName}
                        fullWidth
                      />
                    </ListItem>
                  </List>
                </>
              </SimpleStepperStep>
              <SimpleStepperStep title="Do you want to create a new group?">
                <>
                  <FormControlLabel
                    id="createGroup"
                    name="createGroup"
                    control={
                      <Switch
                        color="primary"
                        name="switch"
                        checked={createGroup}
                      />
                    }
                    label=""
                    labelPlacement="start"
                    onClick={handleGroupClick}
                  />
                  {createGroup && (
                    <InfoCard>
                      <List>
                        <ListItem>
                          <TextField
                            name="groupName"
                            label="Group Name"
                            helperText="The name of the new group."
                            inputProps={{ 'aria-label': 'Group Name' }}
                            onChange={e => setGroupName(e.target.value)}
                            value={groupName}
                            fullWidth
                            required
                          />
                        </ListItem>
                        <ListItem>
                          <TextField
                            name="groupDisplayName"
                            label="Group Display Name"
                            helperText="The display name of the new group."
                            inputProps={{ 'aria-label': 'Group Display Name' }}
                            onChange={e => setGroupDisplayName(e.target.value)}
                            value={groupDisplayName}
                            fullWidth
                            required
                          />
                        </ListItem>
                        <ListItem>
                          <TextField
                            name="groupMembers"
                            label="firstname.lastname, firstname2.lastname2"
                            helperText="Members of the new group."
                            inputProps={{ 'aria-label': 'Group Members' }}
                            onChange={e => setGroupMembers(e.target.value)}
                            value={groupMembers}
                            fullWidth
                            required
                          />
                        </ListItem>
                      </List>
                    </InfoCard>
                  )}
                </>
              </SimpleStepperStep>
              <SimpleStepperStep title="Project Info">
                <>
                  <List>
                    <ListItem>
                      <TextField
                        name="projectName"
                        label="Project Name"
                        helperText="The name of the new project."
                        inputProps={{ 'aria-label': 'Project Name' }}
                        onChange={e => setProjectName(e.target.value)}
                        value={projectName}
                        fullWidth
                      />
                    </ListItem>
                    <ListItem title="Team Name">
                      <TextField
                        name="projectDescription"
                        label="Project Description"
                        helperText="The description for the new project. helper"
                        inputProps={{
                          'aria-label': 'Project Description input props',
                        }}
                        onChange={e => setProjectDescription(e.target.value)}
                        value={projectDescription}
                        fullWidth
                      />
                    </ListItem>
                    {!createGroup && (
                      <ListItem>
                        <TextField
                          name="groupEmail"
                          label="Group Email"
                          helperText="The group email for the project."
                          inputProps={{ 'aria-label': 'Group Email' }}
                          onChange={e => setGroupEmail(e.target.value)}
                          value={groupEmail}
                          fullWidth
                        />
                      </ListItem>
                    )}
                  </List>
                </>
              </SimpleStepperStep>
              <SimpleStepperStep title="Environment">
                <Select
                  onChange={(e: React.ChangeEvent<any>) =>
                    setEnvironment(e?.target?.value)
                  }
                  variant="outlined"
                  label="Default"
                  value={environment}
                  fullWidth
                >
                  {ENV_LIST.map((value: { label: string; value: string }) => (
                    <MenuItem value={value.value}>{value.label}</MenuItem>
                  ))}
                </Select>
              </SimpleStepperStep>
              <SimpleStepperStep
                title="Review"
                actions={{
                  nextText: 'Create',
                  onNext: () => onSubmit(metadata),
                }}
              >
                {info(metadata)}
              </SimpleStepperStep>
            </SimpleStepper>
          </InfoCard>
        </Grid>
      </Grid>
    </Content>
  );
};

const labels = (
  <>
    <HeaderLabel label="Owner" value="trivago" />
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
