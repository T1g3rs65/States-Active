# SovereignHex - Self-Hosted Server
# Docker image for running your own game server
# 
# Usage:
#   docker run -d -p 8001:8001 sovereignhex/server
#
# Or with custom settings:
#   docker run -d -p 8001:8001 \
#     -e SERVER_NAME="My World" \
#     -e WORLD_SEED="12345" \
#     sovereignhex/server

FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements_server.txt .
RUN pip install --no-cache-dir -r requirements_server.txt

# Copy application code
COPY *.py ./

# Environment variables with defaults
ENV SERVER_NAME="SovereignHex Server"
ENV SERVER_DESCRIPTION="A SovereignHex game server"
ENV WORLD_SEED="123456"
ENV MAX_PLAYERS="50"
ENV SERVER_VISIBILITY="public"
ENV SERVER_VERSION="1.0.0"
ENV ALLOW_MIGRATION="true"
ENV MONGO_URL="mongodb://host.docker.internal:27017"
ENV DB_NAME="sovereignhex"

# Expose the API port
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8001/api/server/info || exit 1

# Run the server
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
