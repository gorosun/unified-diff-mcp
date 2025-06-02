# Builder stage
FROM oven/bun:1-alpine AS builder
WORKDIR /app
# Copy package files with correct lockfile name
COPY package.json bun.lock ./
COPY tsconfig.json ./
COPY src ./src
# Install dependencies and build
RUN bun install --frozen-lockfile
# Build TypeScript to JavaScript with proper externals to avoid playwright issues
RUN bun build src/index.ts --outfile dist/index.js --target node --minify --external playwright-core --external chromium-bidi --external electron

# Runtime stage
FROM oven/bun:1-alpine
WORKDIR /app
COPY package.json ./
RUN bun install --production --frozen-lockfile

# Remove Chromium installation to reduce image size for Smithery deployment
# RUN apk add --no-cache chromium nss

COPY --from=builder /app/dist ./dist

# Set default environment variables for Docker environment
ENV DEFAULT_AUTO_OPEN=false
ENV DEFAULT_OUTPUT_MODE=html

CMD ["bun", "dist/index.js"]
