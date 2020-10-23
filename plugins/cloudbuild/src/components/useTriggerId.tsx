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

import { useAsync } from 'react-use';
import { Entity } from '@backstage/catalog-model';

export const CLOUDBUILD_ANNOTATION_TRIGGER_NAME =
  'google.com/cloudbuild-trigger-name;';

export const useTriggerId = (entity: Entity) => {
  const { value, loading, error } = useAsync(async () => {
    return (
      entity?.metadata.annotations?.[CLOUDBUILD_ANNOTATION_TRIGGER_NAME] ?? ''
    );
  });
  return { value, loading, error };
};