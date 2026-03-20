# Use bun base image
FROM oven/bun:1.1 AS base
WORKDIR /app

# Install Icarus Verilog
RUN apt-get update && apt-get install -y \
    iverilog \
    && rm -rf /var/lib/apt/lists/*

# Stage 1: Install dependencies
FROM base AS deps
COPY package.json bun.lockb* ./
RUN bun install
RUN bun add -d prisma@6.11.1
RUN bun add @prisma/client@6.11.1

# Stage 2: Build and Run
FROM deps AS runner
COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3077
ENV DATABASE_URL="file:/app/prisma/dev.db"

# Build the application
RUN bun run db:generate
RUN bun run build

# Copy entrypoint script
COPY scripts/entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh

# Expose the application port
EXPOSE 3077

# Use entrypoint to handle database initialization
ENTRYPOINT ["entrypoint.sh"]
CMD ["bun", "run", "start"]
