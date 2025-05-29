# Builder stage
FROM oven/bun:1-alpine AS builder
WORKDIR /app
# Copy package files with correct lockfile name
COPY package.json bun.lock ./
COPY tsconfig.json ./
COPY src ./src
# Install dependencies and build
RUN bun install --frozen-lockfile
# Build TypeScript to JavaScript directly with bun
RUN bun build src/index.ts --outfile dist/index.js --target node --minify

# Runtime stage
FROM oven/bun:1-alpine
WORKDIR /app
COPY package.json ./
RUN bun install --production --frozen-lockfile
# Install chromium for Playwright
RUN apk add --no-cache chromium nss
COPY --from=builder /app/dist ./dist
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
CMD ["bun", "dist/index.js"]
