FROM node:8 AS builder

COPY . /app

WORKDIR /app

RUN yarn install && yarn start

# build runtime image
FROM nginx:alpine

WORKDIR /usr/share/nginx/html
COPY --from=builder /app/dist /usr/share/nginx/html
