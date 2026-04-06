# Development Dockerfile with multi-stage build
# This Dockerfile supports both development and production builds
# Dev stage includes dev dependencies for hot reload functionality

# Base stage with common dependencies
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./

# Development stage - includes dev dependencies
FROM base AS development
RUN npm ci --include=dev
COPY . .
# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs
USER nodejs
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Production stage - production dependencies only
FROM base AS production
RUN npm ci --only=production && npm cache clean --force
COPY . .
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs && \
    chown -R nodejs:nodejs /app
USER nodejs
EXPOSE 3000
CMD ["npm", "start"]