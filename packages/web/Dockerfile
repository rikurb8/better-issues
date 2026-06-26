FROM node:20-alpine
WORKDIR /workspace
RUN corepack enable
COPY package.json pnpm-workspace.yaml ./
COPY packages/web/package.json packages/web/package.json
RUN pnpm install --frozen-lockfile=false
COPY . .
EXPOSE 3001
CMD ["pnpm", "--filter", "@work-hub/web", "dev", "--host", "0.0.0.0"]
