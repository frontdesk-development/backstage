# It should be executed with the root of the repo as docker context.
# First time you need to change the from to this -> FROM node:12-buster AS build
FROM gcr.io/trv-io-frontdesk-stage/yarn-install-base:latest as build

RUN mkdir -p /etc/github-admin && touch /etc/github-admin/key.yaml && mkdir -p /etc/trv-shared-admin && touch /etc/trv-shared-admin/key.json
COPY . .

RUN yarn install
