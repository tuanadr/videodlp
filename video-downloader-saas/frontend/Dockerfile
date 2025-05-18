# Build stage
FROM node:18-alpine AS build

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the code
COPY . .

# Set environment variables for build
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV ESLINT_NO_DEV_ERRORS=true
ENV DISABLE_ESLINT_PLUGIN=true
ENV CI=false
ENV GENERATE_SOURCEMAP=false
ENV HOST=0.0.0.0
ENV WDS_SOCKET_HOST=0.0.0.0
ENV WDS_SOCKET_PORT=0
ENV DANGEROUSLY_DISABLE_HOST_CHECK=true

# Build the app
RUN npm run build

# Production stage
FROM nginx:1.23-alpine

# Copy custom nginx configs
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx/coolify.conf /etc/nginx/conf.d/coolify.conf

# Remove default nginx config to avoid conflicts
RUN rm -f /etc/nginx/conf.d/default.conf && \
    mv /etc/nginx/conf.d/coolify.conf /etc/nginx/conf.d/default.conf

# Copy built files from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Create a health check file
RUN echo "OK" > /usr/share/nginx/html/health.txt

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]