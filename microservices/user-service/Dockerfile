FROM node:20-alpine

RUN apk add --no-cache tini curl

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

USER node

EXPOSE 3001

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
