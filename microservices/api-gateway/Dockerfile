FROM node:20-alpine

RUN apk add --no-cache tini curl

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

USER node

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
