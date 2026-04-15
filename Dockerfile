# Build the Node.js Backend 
FROM node:18-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/ ./

# Serve the Frontend using a simple static server (or within Node.js)
# Let's serve everything from the single Node.js Express server to make it simple 
# We'll need to modify server.js mildly to serve the frontend dist but wait, in MERN we usually map static folders.
# Since it's Vanilla JS, we can just copy it to the container or use docker-compose to run it separately.

FROM node:18-alpine
WORKDIR /app
COPY --from=backend-builder /app/backend /app/backend
# Mount frontend into a known path or configure Nginx.
# Let's assume we run the backend server which isn't configured for static files natively.
# We'll install serve globally or serve it using docker-compose.

# For this multi-container app, we just containerize the backend here.
WORKDIR /app/backend
EXPOSE 5000
CMD ["npm", "start"]
