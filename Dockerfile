# Use official Node.js image
FROM node:20

# Set working directory
WORKDIR /app

# Copy all files
COPY . .

# Install backend/root dependencies
RUN npm install

# Install frontend dependencies and build frontend
WORKDIR /app/src/webapp
RUN npm install
RUN npm run build

# Go back to root and build backend (TypeScript, etc.)
WORKDIR /app
RUN npm run build

# Expose the port your app runs on (adjust if needed)
EXPOSE 3000

# Start the app
CMD ["npm", "start"] 