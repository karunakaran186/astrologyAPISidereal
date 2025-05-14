# Base image with Node.js and build tools
FROM node:18

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of your app
COPY . .

# Expose your desired port
EXPOSE 3000

# Start your app
CMD ["node", "index.js"]
