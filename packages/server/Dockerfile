# RUN DOCKER BUILD FROM ROOT OF THE WORKSPACE!!!
FROM node:18.12.1-buster-slim

ENV UV_THREADPOOL_SIZE 64
ENV NODE_ENV=production

ARG COMMIT_ID

WORKDIR /app

COPY packages/server/package.json packages/server/
COPY package.json .
COPY package-lock.json .

RUN npm ci --only=production

COPY packages/server/dist packages/server/dist

EXPOSE 3000

WORKDIR /app/packages/server

CMD [ "node", "dist/index.js"]

