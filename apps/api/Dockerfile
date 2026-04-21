FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install --production

# Copy source
COPY src/ ./src/

ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", "src/index.js"]
