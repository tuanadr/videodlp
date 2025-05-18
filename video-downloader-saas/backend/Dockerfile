# Build stage
FROM node:18-alpine AS build

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the code
COPY . .

# Build TypeScript code
RUN npm run build

# Production stage
FROM node:18-alpine

# Install ffmpeg and yt-dlp dependencies
RUN apk add --no-cache ffmpeg python3 py3-pip curl bash

# Install yt-dlp
RUN pip3 install --no-cache-dir yt-dlp

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built files from build stage
COPY --from=build /app/dist ./dist

# Copy utility scripts and configuration files
COPY utils ./utils
COPY .env.coolify ./.env

# Create necessary directories
RUN mkdir -p downloads logs database

# Set proper permissions for Linux
RUN chmod -R 755 downloads logs database

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000
ENV UV_THREADPOOL_SIZE=4

# Create a health check file
RUN echo "OK" > ./health.txt

# Expose port
EXPOSE 5000

# Start the server
CMD ["node", "dist/server.js"]