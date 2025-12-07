# Using an official Node image
FROM node:18-alpine

# Creates the app directory
WORKDIR /usr/src/app

# Installs the dependencies 
COPY package*.json ./

RUN npm install --only=production

# Copy the rest of the app
COPY . .

# Sets environment
ENV NODE_ENV=production

# Expose the port your app listens on
EXPOSE 3000

# Start the app
CMD ["npm", "start"]
