# Build stage
FROM node:18-alpine AS build

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the code
COPY . .

# This project doesn't use TypeScript compilation despite having tsconfig.json
# Main file is server.js (JavaScript)

# Production stage
FROM node:18-alpine

# Install ffmpeg, yt-dlp dependencies, and build tools
RUN apk add --no-cache ffmpeg python3 py3-pip curl bash py3-virtualenv \
    build-base python3-dev

# Install yt-dlp in a virtual environment
RUN python3 -m venv /opt/venv && \
    /opt/venv/bin/pip install --no-cache-dir yt-dlp && \
    ln -s /opt/venv/bin/yt-dlp /usr/local/bin/yt-dlp

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Remove any existing node_modules and install fresh
RUN rm -rf node_modules package-lock.json

# Copy source files from build stage (excluding node_modules)
COPY --from=build /app/controllers ./controllers
COPY --from=build /app/middleware ./middleware
COPY --from=build /app/models ./models
COPY --from=build /app/routes ./routes
COPY --from=build /app/services ./services
COPY --from=build /app/utils ./utils
COPY --from=build /app/config ./config
COPY --from=build /app/database ./database
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/types ./types
COPY --from=build /app/package*.json ./
COPY --from=build /app/server.js ./
COPY --from=build /app/database.js ./
COPY --from=build /app/jest.config.js ./
COPY --from=build /app/tsconfig.json ./

# Install production dependencies only and rebuild native modules
RUN npm install --only=production && \
    npm rebuild --build-from-source

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
CMD ["node", "server.js"]