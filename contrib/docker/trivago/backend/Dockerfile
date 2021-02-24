# This dockerfile builds an image for the backend package.
# It should be executed with the root of the repo as docker context.

FROM node:12-buster AS build

RUN mkdir /app
COPY . /app
WORKDIR /app

RUN yarn install
RUN yarn tsc
RUN echo "Building Backend..."
RUN yarn workspace example-backend build --build-dependencies


# Contruct frontdesk-backend image
FROM gcr.io/trv-io-frontdesk-stage/frontdesk-backend-base:latest

RUN mkdir /app
RUN mkdir -p /etc/github-admin && touch /etc/github-admin/key.yaml
RUN mkdir -p /etc/trv-shared-admin && touch /etc/trv-shared-admin/key.json
WORKDIR /app

# Copy repo skeleton first, to avoid unnecessary docker cache invalidation.
# The skeleton contains the package.json of each package in the monorepo,
# and along with yarn.lock and the root package.json, that's enough to run yarn install.
COPY --from=build /app/yarn.lock /app/package.json /app/packages/backend/dist/skeleton.tar.gz /app/packages/backend/dist/bundle.tar.gz /app/app-config.yaml /app/test-cred ./

RUN tar -zxvf bundle.tar.gz
RUN yarn install --frozen-lockfile --production --network-timeout 300000 && rm -rf "$(yarn cache dir)"

# Then copy the rest of the backend bundle, along with any other files we might want.
#ADD packages/backend/dist/bundle.tar.gz app-config.yaml ./

CMD ["node", "packages/backend", "--config", "app-config.yaml"]
