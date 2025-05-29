# Builder stage
FROM oven/bun:1 AS builder
WORKDIR /app
# Copy manifest and lockfile
COPY package.json bun.lockb ./
COPY tsconfig.json ./
# Copy source
COPY src ./src
# Install dependencies and build
RUN bun install --frozen-lockfile
RUN bun run build

# Runtime stage
FROM oven/bun:1
WORKDIR /app
# Install runtime dependencies
COPY package.json ./
RUN bun install --production --frozen-lockfile
# Install chromium for Playwright
RUN apk add --no-cache chromium nss
# Copy built files
COPY --from=builder /app/dist ./dist
# Set Chromium path
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
# Default command
CMD ["bun", "dist/index.js"]
