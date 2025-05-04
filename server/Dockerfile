FROM node:20.18.0-slim

WORKDIR /app

RUN npm install -g corepack@latest
RUN corepack enable

COPY package.json .
COPY pnpm-lock.yaml .

RUN pnpm install

COPY . .

CMD ["pnpm", "start"]
