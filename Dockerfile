FROM node:20-alpine

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

RUN npm install

# Copy source code
COPY . .

EXPOSE 5000

CMD ["npm", "run", "dev"]
