# This dockerfile builds an image for the frontend package.
FROM gcr.io/trv-io-frontdesk-stage/yarn-install-base:latest as build

WORKDIR /app

RUN mkdir -p /etc/github-admin && touch /etc/github-admin/key.yaml && mkdir -p /etc/trv-shared-admin && touch /etc/trv-shared-admin/key.json
RUN yarn workspace example-app build

FROM nginx:mainline 

RUN apt-get update && apt-get -y install jq && rm -rf /var/lib/apt/lists/*

# Copy from build stage
COPY --from=build /app/packages/app/dist /usr/share/nginx/html

COPY docker/default.conf.template /etc/nginx/conf.d/default.conf.template
COPY docker/run.sh /usr/local/bin/run.sh

CMD run.sh

ENV PORT 80