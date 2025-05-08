# Use official Node.js image
FROM node:20

# Set working directory
WORKDIR /app

# Copy all files
COPY . .

# Install all dependencies (root and webapp handled by build script)
RUN npm install

# Build both frontend and backend using the root build script
RUN npm run build

# Expose the port your app runs on (adjust if needed)
EXPOSE 3000

# Start the app
CMD ["npm", "start"] 