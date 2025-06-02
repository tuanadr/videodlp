# Build stage
FROM node:18-slim AS build

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
FROM node:18-slim

# Install ffmpeg, yt-dlp dependencies, and build tools including PostgreSQL dev
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    bash \
    build-essential \
    python3-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp in a virtual environment
RUN python3 -m venv /opt/venv && \
    /opt/venv/bin/pip install --no-cache-dir yt-dlp && \
    ln -s /opt/venv/bin/yt-dlp /usr/local/bin/yt-dlp

# Create app directory
WORKDIR /app

# Copy source files from build stage (including node_modules)
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
COPY --from=build /app/node_modules ./node_modules

# Install pg package specifically for PostgreSQL support
RUN npm install pg --save && \
    npm rebuild pg --build-from-source

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