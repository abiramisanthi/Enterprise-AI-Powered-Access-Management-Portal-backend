# Use Node image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --only=production

# Copy all project files
COPY . .

# Expose port
EXPOSE 5000

# Start the backend
CMD ["npm", "start"]