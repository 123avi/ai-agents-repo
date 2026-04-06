FROM node:18-alpine

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the TypeScript application
RUN npm run build

# Expose the application port
EXPOSE 3000

# Start the application in development mode with hot reload
CMD ["npm", "run", "dev"]