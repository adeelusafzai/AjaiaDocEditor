# Portable API image (optional — for Fly.io / any container host).
# From the repo root:  docker build -f server/Dockerfile -t ajaia-docs-api .
FROM node:22-alpine
WORKDIR /app

# Install only the server workspace's dependencies.
COPY package.json ./
COPY server/package.json ./server/
RUN npm install --workspace server --omit=dev

COPY server ./server

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000
CMD ["npm", "--workspace", "server", "start"]
