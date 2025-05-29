# Builder stage
FROM oven/bun:1 AS builder
WORKDIR /app
# Copy package files with correct lockfile name
COPY package.json bun.lock ./
COPY tsconfig.json ./
COPY src ./src
# Install dependencies and build
RUN bun install --frozen-lockfile
RUN bun run build

# Runtime stage
FROM oven/bun:1
WORKDIR /app
COPY package.json ./
RUN bun install --production --frozen-lockfile
# Install chromium for Playwright
RUN apk add --no-cache chromium nss
COPY --from=builder /app/dist ./dist
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
CMD ["bun", "dist/index.js"]
