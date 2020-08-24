# CloudBuild Plugin

Website: https://cloud.google.com/cloud-build

## Open questions

- [ ] Should it be "cloudbuild" or "cloud-build"?

## TODO:

- [ ] Add screenshots

## Setup

0. If you have standalone app (you didn't clone this repo), then do

```bash
yarn add @backstage/plugin-cloudbuild
```

1. Add plugin API to your Backstage instance:

```js
// packages/app/src/api.ts
import { ApiHolder } from '@backstage/core';
import { CloudBuildApi, cloudBuildApiRef } from '@backstage/plugin-cloudbuild';

const builder = ApiRegistry.builder();
builder.add(cloudBuildApiRef, new CloudBuildApi());

export default builder.build() as ApiHolder;
```

2. Add plugin itself:

```js
// packages/app/src/plugins.ts
export { plugin as CloudBuild } from '@backstage/plugin-cloudbuild';
```

3. Run app with `yarn start` and navigate to `/cloudbuild/settings`
4. Enter project settings and **project** token, acquired according to [https://cloudbuild.com/docs/2.0/managing-api-tokens/](https://cloudbuild.com/docs/2.0/managing-api-tokens/)

## Features

- List top 50 builds for a project
- Dive into one build to see logs
- Polling (logs only)
- Retry builds
- Works for both project and personal tokens
- Pagination for builds

## Limitations

- CloudBuild has pretty strict rate limits per token, be careful with opened tabs
