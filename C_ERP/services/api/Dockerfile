FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY services/api/package.json services/api/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN npm install --workspaces --include-workspace-root

FROM deps AS build
COPY . .
RUN npm run build --workspace @nexaerp/shared-types && npm run build --workspace @nexaerp/api

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/services/api/dist ./services/api/dist
COPY --from=build /app/services/api/package.json ./services/api/package.json
EXPOSE 4000
CMD ["node", "services/api/dist/main.js"]
