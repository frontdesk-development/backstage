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

import React, { useCallback, useEffect, useState } from 'react';
import { Box, Container, Divider, Grid, Typography } from '@material-ui/core';
import { Progress, useApi } from '@backstage/core';
import { default as MaterialAlert } from '@material-ui/lab/Alert';
import { costInsightsApiRef } from '../../api';
import { AlertActionCardList } from '../AlertActionCardList';
import { AlertInsights } from '../AlertInsights';
import { CostInsightsLayout } from '../CostInsightsLayout';
// import { CopyUrlToClipboard } from '../CopyUrlToClipboard';
import { CurrencySelect } from '../CurrencySelect';
// import { WhyCostsMatter } from '../WhyCostsMatter';
import {
  // CostInsightsHeader,
  CostInsightsHeaderNoGroups,
} from '../CostInsightsHeader';
// import { CostInsightsNavigation } from '../CostInsightsNavigation';
import { CostOverviewCard } from '../CostOverviewCard';
import { ProductInsights } from '../ProductInsights';
/* https://github.com/backstage/backstage/issues/2574 */
// import { CostInsightsSupportButton } from '../CostInsightsSupportButton';
import {
  useConfig,
  useCurrency,
  useFilters,
  useGroups,
  useLastCompleteBillingDate,
  useLoading,
} from '../../hooks';
import {
  Alert,
  Cost,
  Maybe,
  MetricData,
  // Product,
  Project,
  Label,
} from '../../types';
import { mapLoadingToProps } from './selector';
import { ProjectSelect } from '../ProjectSelect';
import { LabelTierSelect } from '../LabelTierSelect';
import { LabelPillarSelect } from '../LabelPillarSelect';
import { LabelDomainSelect } from '../LabelDomainSelect';
import { LabelProductSelect } from '../LabelProductSelect';
import { LabelTeamSelect } from '../LabelTeamSelect';
import { intervalsOf } from '../../utils/duration';
import { useSubtleTypographyStyles } from '../../utils/styles';

export const CostInsightsPage = () => {
  const classes = useSubtleTypographyStyles();
  const client = useApi(costInsightsApiRef);
  const config = useConfig();
  console.log("GCP Config: ", config.gcpConfig);
  client.setConfig(config.gcpConfig);
  const groups = useGroups();
  const lastCompleteBillingDate = useLastCompleteBillingDate();
  const [currency, setCurrency] = useCurrency();
  const [projects, setProjects] = useState<Maybe<Project[]>>(null);
  const [tierLabel, setTierLabels] = useState<Maybe<Label[]>>(null);
  const [pillarLabel, setPillarLabels] = useState<Maybe<Label[]>>(null);
  const [domainLabel, setDomainLabels] = useState<Maybe<Label[]>>(null);
  const [productLabel, setProductLabels] = useState<Maybe<Label[]>>(null);
  const [teamLabel, setTeamLabels] = useState<Maybe<Label[]>>(null);
  // const [product, setProducts] = useState<Maybe<Product[]>>(null);
  const [dailyCost, setDailyCost] = useState<Maybe<Cost>>(null);
  const [metricData, setMetricData] = useState<Maybe<MetricData>>(null);
  const [alerts, setAlerts] = useState<Maybe<Alert[]>>(null);
  const [error, setError] = useState<Maybe<Error>>(null);

  const { pageFilters, setPageFilters } = useFilters(p => p);

  const {
    loadingActions,
    loadingGroups,
    loadingBillingDate,
    loadingInitial,
    dispatchInitial,
    dispatchInsights,
    dispatchNone,
    dispatchReset,
  } = useLoading(mapLoadingToProps);

  /* eslint-disable react-hooks/exhaustive-deps */
  // The dispatchLoading functions are derived from loading state using mapLoadingToProps, to
  // provide nicer props for the component. These are re-derived whenever loading state changes,
  // which causes an infinite loop as product panels load and re-trigger the useEffect below.
  // Since the functions don't change, we can memoize - but we trigger the same loop if we satisfy
  // exhaustive-deps by including the function itself in dependencies.

  const dispatchLoadingInitial = useCallback(dispatchInitial, []);
  const dispatchLoadingInsights = useCallback(dispatchInsights, []);
  const dispatchLoadingNone = useCallback(dispatchNone, []);
  const dispatchLoadingReset = useCallback(dispatchReset, []);
  /* eslint-enable react-hooks/exhaustive-deps */

  const setProject = (project: Maybe<string>) =>
    setPageFilters({
      ...pageFilters,
      project: project === 'all' ? null : project,
    });

  const setTier = (tier: Maybe<string>) =>
    setPageFilters({
      ...pageFilters,
      tierLabel: tier === 'all' ? null : tier,
    });

  const setPillar = (pillar: Maybe<string>) =>
    setPageFilters({
      ...pageFilters,
      pillarLabel: pillar === 'all' ? null : pillar,
    });

  const setTeam = (team: Maybe<string>) =>
    setPageFilters({
      ...pageFilters,
      teamLabel: team === 'all' ? null : team,
    });

  const setProduct = (product: Maybe<string>) =>
    setPageFilters({
      ...pageFilters,
      productLabel: product === 'all' ? null : product,
    });

  const setDomain = (domain: Maybe<string>) =>
    setPageFilters({
      ...pageFilters,
      domainLabel: domain === 'all' ? null : domain,
    });

  useEffect(() => {
    async function getInsights() {
      setError(null);
      try {
        if (pageFilters.group) {
          dispatchLoadingInsights(true);
          const intervals = intervalsOf(
            pageFilters.duration,
            lastCompleteBillingDate,
          );
          const [
            fetchedProjects,
            fetchedTierLabels,
            fetchedPillarLabels,
            fetchedDomainLabels,
            fetchedProductLabels,
            fetchedTeamLabels,
            fetchedAlerts,
            fetchedMetricData,
            fetchedDailyCost,
          ] = await Promise.all([
            client.getGroupProjects(pageFilters.group),
            client.getTierLabels(pageFilters.project),
            client.getPillarLabels(pageFilters.project),
            client.getDomainLabels(pageFilters.project),
            client.getProductLabels(pageFilters.project),
            client.getTeamLabels(pageFilters.project),
            client.getAlerts(pageFilters.group),
            pageFilters.metric
              ? client.getDailyMetricData(pageFilters.metric, intervals)
              : null,
            pageFilters.project
              ? client.getProjectDailyCost(pageFilters, intervals)
              : client.getGroupDailyCost(pageFilters, intervals),
          ]);
          setProjects(fetchedProjects);
          setTierLabels(fetchedTierLabels);
          setPillarLabels(fetchedPillarLabels);
          setDomainLabels(fetchedDomainLabels);
          setProductLabels(fetchedProductLabels);
          setTeamLabels(fetchedTeamLabels);
          setAlerts(fetchedAlerts);
          setMetricData(fetchedMetricData);
          setDailyCost(fetchedDailyCost);
        } else {
          dispatchLoadingNone(loadingActions);
        }
      } catch (e) {
        setError(e);
        dispatchLoadingNone(loadingActions);
      } finally {
        dispatchLoadingInitial(false);
        dispatchLoadingInsights(false);
      }
    }

    // Wait for metadata to finish loading
    if (!(loadingGroups && loadingBillingDate)) {
      getInsights();
    }
  }, [
    client,
    pageFilters,
    loadingActions,
    loadingGroups,
    loadingBillingDate,
    dispatchLoadingInsights,
    dispatchLoadingInitial,
    dispatchLoadingNone,
    lastCompleteBillingDate,
  ]);

  if (loadingInitial) {
    return <Progress />;
  }

  if (error) {
    return <MaterialAlert severity="error">{error.message}</MaterialAlert>;
  }

  // Loaded but no groups found for the user
  if (!pageFilters.group) {
    return (
      <CostInsightsLayout groups={groups}>
        {/* <Box textAlign="right"> */}
        {/* <CopyUrlToClipboard /> */}
        {/* <CostInsightsSupportButton /> */}
        {/* </Box> */}
        <Container maxWidth="lg">
          <CostInsightsHeaderNoGroups />
        </Container>
        {/* <Divider /> */}
        {/* <Container maxWidth="lg">
          <WhyCostsMatter />
        </Container> */}
      </CostInsightsLayout>
    );
  }
  // These should be defined, alerts can be an empty array but that's truthy
  if (!dailyCost || !alerts) {
    return (
      <MaterialAlert severity="error">{`Error: Could not fetch cost insights data for team ${pageFilters.group}`}</MaterialAlert>
    );
  }

  const onProjectSelect = (project: Maybe<string>) => {
    setProject(project);
    dispatchLoadingReset(loadingActions);
  };

  const onTierLabelSelect = (tierLabel: Maybe<string>) => {
    setTier(tierLabel);
    dispatchLoadingReset(loadingActions);
  };

  const onPillarLabelSelect = (pillarLabel: Maybe<string>) => {
    setPillar(pillarLabel);
    dispatchLoadingReset(loadingActions);
  };

  const onDomainLabelSelect = (domainLabel: Maybe<string>) => {
    setDomain(domainLabel);
    dispatchLoadingReset(loadingActions);
  };

  const onProductLabelSelect = (productLabel: Maybe<string>) => {
    setProduct(productLabel);
    dispatchLoadingReset(loadingActions);
  };

  const onTeamLabelSelect = (teamLabel: Maybe<string>) => {
    setTeam(teamLabel);
    dispatchLoadingReset(loadingActions);
  };

  const CostOverviewBanner = () => (
    <Box
      px={3}
      pt={6}
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      minHeight={40}
    >
      <Box>
        <Typography variant="h4">Cost Overview</Typography>
        <Typography classes={classes}>
          Billing data as of {lastCompleteBillingDate}
        </Typography>
      </Box>
      <Box display="flex">
        <Box mr={1}>
          <CurrencySelect
            currency={currency}
            currencies={config.currencies}
            onSelect={setCurrency}
          />
        </Box>
        <ProjectSelect
          project={pageFilters.project}
          projects={projects || []}
          onSelect={onProjectSelect}
        />
      </Box>
    </Box>
  );

  const LabelsBanner = () => (
    <Box
      px={3}
      display="flex"
      justifyContent="flex-end"
      alignItems="center"
      minHeight={40}
    >
      <Box mr={1}>
        <LabelTierSelect
          label={pageFilters.tierLabel}
          labels={tierLabel || []}
          onSelect={onTierLabelSelect}
        />
      </Box>
      <Box mr={1}>
        <LabelPillarSelect
          label={pageFilters.pillarLabel}
          labels={pillarLabel || []}
          onSelect={onPillarLabelSelect}
        />
      </Box>
      <Box mr={1}>
        <LabelDomainSelect
          label={pageFilters.domainLabel}
          labels={domainLabel || []}
          onSelect={onDomainLabelSelect}
        />
      </Box>
      <Box mr={1}>
        <LabelProductSelect
          label={pageFilters.productLabel}
          labels={productLabel || []}
          onSelect={onProductLabelSelect}
        />
      </Box>
      <Box>
        <LabelTeamSelect
          label={pageFilters.teamLabel}
          labels={teamLabel || []}
          onSelect={onTeamLabelSelect}
        />
      </Box>
    </Box>
  );

  return (
    <CostInsightsLayout groups={groups}>
      <Grid container wrap="nowrap">
        {/* <Grid item>
          <Box position="sticky" top={20}>
            <CostInsightsNavigation
              products={products}
              alerts={alerts.length}
            />
          </Box>
        </Grid> */}
        <Grid item xs>
          <Box
            display="flex"
            flexDirection="row"
            justifyContent="flex-end"
            mb={2}
          >
            {/* <CopyUrlToClipboard /> */}
            {/* <CostInsightsSupportButton /> */}
          </Box>
          <Container maxWidth="lg" disableGutters>
            <Grid container direction="column">
              {/* <Grid item xs>
                <CostInsightsHeader
                  owner={pageFilters.group}
                  groups={groups}
                  hasCostData={!!dailyCost.aggregation.length}
                  alerts={alerts.length}
                />
              </Grid> */}
              {!!alerts.length && (
                <>
                  <Grid item xs>
                    <Box px={3} py={6}>
                      <AlertActionCardList alerts={alerts} />
                    </Box>
                  </Grid>
                  <Divider />
                </>
              )}
              <Grid item xs>
                <CostOverviewBanner />
              </Grid>
              <Grid item xs>
                <LabelsBanner />
                <Box px={3} py={6} pt={2}>
                  {!!dailyCost.aggregation.length && (
                    <CostOverviewCard
                      dailyCostData={dailyCost}
                      metricData={metricData}
                    />
                  )}
                  {/* <WhyCostsMatter /> */}
                </Box>
              </Grid>
              <Grid item xs>
                {!!alerts?.length && (
                  <Box px={6} py={6} mx={-3} bgcolor="alertBackground">
                    <AlertInsights alerts={alerts} />
                  </Box>
                )}
              </Grid>
              {!alerts.length && <Divider />}
              <Grid item xs>
                <Box px={3} py={6}>
                  <ProductInsights
                    group={pageFilters.group}
                    project={pageFilters.project}
                    products={config.products}
                    onLoaded={() => undefined}
                    // onLoaded={setProducts}
                  />
                </Box>
              </Grid>
            </Grid>
          </Container>
        </Grid>
      </Grid>
    </CostInsightsLayout>
  );
};
