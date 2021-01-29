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

import React, { useCallback, useEffect, useRef, useState } from 'react';
// import { Box, Typography } from '@material-ui/core';
import { Box } from '@material-ui/core';
import { default as Alert } from '@material-ui/lab/Alert';
import { useApi } from '@backstage/core';
import { costInsightsApiRef } from '../../api';
// import { ProductInsightsCardList } from '../ProductInsightsCard/ProductInsightsCardList';
// import { Duration, Entity, Maybe, Product } from '../../types';
import { Maybe, Product } from '../../types';
import { intervalsOf, DEFAULT_DURATION } from '../../utils/duration';
import {
  DefaultLoadingAction,
  initialStatesOf,
  settledResponseOf,
  ProductState,
} from '../../utils/loading';
import { totalAggregationSort } from '../../utils/sort';
import {
  useLoading,
  useLastCompleteBillingDate,
  MapLoadingToProps,
} from '../../hooks';

type LoadingProps = (isLoading: boolean) => void;

const mapLoadingToProps: MapLoadingToProps<LoadingProps> = ({ dispatch }) => (
  isLoading: boolean,
) => dispatch({ [DefaultLoadingAction.CostInsightsProducts]: isLoading });

type ProductInsightsProps = {
  group: string;
  project: Maybe<string>;
  products: Product[];
  onLoaded: (entities: Product[]) => void;
};

export const ProductInsights = ({
  group,
  project,
  products,
  onLoaded,
}: ProductInsightsProps) => {
  const client = useApi(costInsightsApiRef);
  const onceRef = useRef(false);
  const [initialStates, setStates] = useState<ProductState[]>([]);
  const [error, setError] = useState<Maybe<Error>>(null);
  const lastCompleteBillingDate = useLastCompleteBillingDate();
  const dispatchLoading = useLoading(mapLoadingToProps);

  /* eslint-disable react-hooks/exhaustive-deps */
  // See @CostInsightsPage
  const dispatchLoadingProducts = useCallback(dispatchLoading, []);
  /* eslint-enable react-hooks/exhaustive-deps */

  // const onSelectAsyncMemo = useCallback(
  //   async function onSelectAsync(
  //     product: Product,
  //     duration: Duration,
  //   ): Promise<Entity> {
  //     return client.getProductInsights({
  //       group: group,
  //       project: project,
  //       product: product.kind,
  //       intervals: intervalsOf(duration, lastCompleteBillingDate),
  //     });
  //   },
  //   [client, group, project, lastCompleteBillingDate],
  // );

  useEffect(() => {
    async function getAllProductInsights(
      group: string,
      project: Maybe<string>,
      products: Product[],
      lastCompleteBillingDate: string,
    ) {
      try {
        dispatchLoadingProducts(true);
        const responses = await Promise.allSettled(
          products.map(product =>
            client.getProductInsights({
              group: group,
              project: project,
              product: product.kind,
              intervals: intervalsOf(DEFAULT_DURATION, lastCompleteBillingDate),
            }),
          ),
        ).then(settledResponseOf);

        const initialStates = initialStatesOf(products, responses).sort(
          totalAggregationSort,
        );
        setStates(initialStates);
      } catch (e) {
        setError(e);
      } finally {
        dispatchLoadingProducts(false);
      }
    }

    getAllProductInsights(group, project, products, lastCompleteBillingDate);
  }, [
    client,
    group,
    project,
    products,
    lastCompleteBillingDate,
    dispatchLoadingProducts,
  ]);

  useEffect(
    function handleOnLoaded() {
      if (onceRef.current) {
        const products = initialStates.map(state => state.product);
        onLoaded(products);
      } else {
        onceRef.current = true;
      }
    },
    [initialStates, onLoaded],
  );

  return (
    <Box px={3} py={6}>
      {/* <Box mt={0} mb={5} textAlign="center">
        <Typography variant="h4" gutterBottom>
          Your team's product usage
        </Typography>
      </Box> */}
      {error && <Alert severity="error">{error.message}</Alert>}
    </Box>
  );
};
