#!/bin/sh
set -e

# Run migrations if database doesn't exist or just to be safe
echo "Initializing database..."
# Ensure client is generated in this environment
bun run db:generate
bun run db:push

# Execute CMD
exec "$@"
