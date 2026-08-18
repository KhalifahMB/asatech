# ASATECH Backend Dockerfile
# Node.js 20 LTS

FROM node:20-alpine

# Install dependencies for node-gyp (if needed)
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Set environment to production
ENV NODE_ENV=production

# Start application
CMD ["node", "src/app.js"]
