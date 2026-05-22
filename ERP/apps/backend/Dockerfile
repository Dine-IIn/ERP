# FROM node:20-bookworm-slim AS deps

# WORKDIR /app

# COPY package.json package-lock.json ./
# COPY apps/backend/package.json ./apps/backend/package.json

# RUN npm ci --workspaces --include-workspace-root && test -d node_modules

# FROM node:20-bookworm-slim AS build

# WORKDIR /app

# COPY --from=deps /app/node_modules ./node_modules
# COPY . .

# RUN npm run backend:build

# FROM node:20-bookworm-slim AS runtime

# WORKDIR /app

# ENV NODE_ENV=production

# COPY package*.json ./
# COPY apps/backend/package.json ./apps/backend/package.json
# COPY --from=deps /app/node_modules ./node_modules
# COPY --from=build /app/apps/backend/dist ./apps/backend/dist

# EXPOSE 3000

# CMD ["node", "apps/backend/dist/main.js"]
FROM --platform=linux/amd64 node:20-bookworm-slim AS deps

WORKDIR /app

COPY . .

RUN npm install

FROM --platform=linux/amd64 node:20-bookworm-slim AS build

WORKDIR /app

COPY --from=deps /app ./

RUN npm run backend:build

FROM --platform=linux/amd64 node:20-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/apps/backend/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

EXPOSE 3000

CMD ["node", "dist/main.js"]
