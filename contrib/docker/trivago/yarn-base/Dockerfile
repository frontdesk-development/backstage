# It should be executed with the root of the repo as docker context.

FROM node:12-buster AS build

RUN mkdir -p /etc/github-admin && touch /etc/github-admin/key.yaml && mkdir -p /etc/trv-shared-admin && touch /etc/trv-shared-admin/key.json
COPY . .

RUN yarn install
