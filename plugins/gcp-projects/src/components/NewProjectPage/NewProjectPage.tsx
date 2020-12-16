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
  configApiRef,
} from '@backstage/core';
import { Grid, TextField, Select, MenuItem } from '@material-ui/core';
import {
  subnetsTfRender,
  projectsTfRenderPlayground,
  projectsTfRenderStages,
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
  const [pilar, setPilar] = useState('');
  const [environment, setEnvironment] = useState('playground');
  const [teamName, setTeamName] = useState('');
  const groupNamePrefix = `trv-${pilar}-${teamName}-`;
  const [groupEmail, setGroupEmail] = useState('');
  const [projectDescription, setProjectDescription] = useState(
    'Project Description',
  );

  const projectId = projectName;

  const metadata: Metadata = {
    email: email,
    pilar: pilar,
    teamName: teamName,
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
  };

  const ProjectsTfTemplate = () => {
    if (environment === 'edge-stage-prod') {
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

  const SubnetsTfTemplate = () => {
    metadata.subnetsTf = subnetsTfRender(metadata);
    return (
      <textarea
        style={{ height: '250px', width: '100%' }}
        readOnly
        value={subnetsTfRender(metadata)}
      />
    );
  };

  const ENV_LIST = [
    {
      label: 'Edge-Stage-Prod (Europe Only)',
      value: 'edge-stage-prod-us',
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
              <SimpleStepperStep title="Group Email">
                <TextField
                  variant="outlined"
                  name="groupEmail"
                  label="Group Email"
                  helperText="The group email for the project."
                  inputProps={{ 'aria-label': 'Group Email' }}
                  onChange={e => setGroupEmail(e.target.value)}
                  value={groupEmail}
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
          <InfoCard title="subnets.tf">
            <SubnetsTfTemplate />
          </InfoCard>
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
