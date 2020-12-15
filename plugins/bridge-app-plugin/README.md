# Bridge Plugin for Backstage

![a preview of the Bridge plugin](https://raw.githubusercontent.com/trivago/backstage-plugin-bridge/main/docs/bridge-plugin.png)

## Plugin Setup

1. If you have standalone app (you didn't clone this repo), then do

```bash
yarn add @trivago/backstage-plugin-bridge
```

2. Add plugin to the list of plugins:

```ts
// packages/app/src/plugins.ts
export { plugin as BridgeAppPlugin } from '@trivago/backstage-plugin-bridge';
```

3. Add plugin API to your Backstage instance:

```ts
// packages/app/src/components/catalog/EntityPage.tsx
import { Router as BridgeRouter } from '@trivago/backstage-plugin-bridge';

...

const ServiceEntityPage = ({ entity }: { entity: Entity }) => (
  <EntityPageLayout>
    ...
    <EntityPageLayout.Content
        path="/bridge/*"
        title="BRIDGE"
        element={<BridgeRouter entity={entity} />}
      />
  </EntityPageLayout>
```

4. Add the following configuration to the app-config.yaml proxy:

```
proxy:
    '/bridge/api':
    target: https://company.bridgeapp.com/api
    headers:
      Authorization:
        $env: BRIDGE_TOKEN

bridge:
  url: https://company.bridgeapp.com
```

(you need a token from the bridge application)

5. Run backstage app with `yarn start` and navigate to services tabs.

6. For a component to use this you would need to add an annotation to it:

```
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: example-component
  description: Example description
  annotations:
    bridge.com/course-tag: yourTag
spec:
  type: service
  lifecycle: experimental
  owner: your.user
```

This `yourTag` will filter all the courses for the ones containing the tag you specified.

## Features

- Add Bridge plugin tab.

## Links

- [Backstage](https://backstage.io)
