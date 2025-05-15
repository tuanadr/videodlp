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
RUN apk add --no-cache ffmpeg python3 py3-pip curl

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

# Create downloads directory
RUN mkdir -p downloads

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

# Start the server
CMD ["node", "dist/server.js"]