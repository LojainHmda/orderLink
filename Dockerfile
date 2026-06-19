# OrderLink — single-image deploy for Cloud Run.
# Builds the shared package, the Express API, and the React client, then runs
# the API which also serves the built client from the same origin.

# ---------- build ----------
FROM node:20-slim AS build
WORKDIR /app

# Prisma's query engine needs OpenSSL.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy the full source, then install: the root postinstall builds
# @orderlink/shared, which needs its tsconfig + sources present.
COPY . .
RUN npm ci

# Generate the Prisma client (Linux engine) and build the API + client.
# (shared is already built by the postinstall above.)
RUN npm run db:generate --workspace server \
 && npm run build --workspace server \
 && npm run build --workspace client

# ---------- runtime ----------
FROM node:20-slim AS runtime
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
# Tells the API where the built client lives (served from the same origin).
ENV CLIENT_DIST=/app/public

# node_modules carries the generated Prisma client + the API's runtime deps.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/server/package.json ./server/package.json
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/prisma ./server/prisma
COPY --from=build /app/client/dist ./public

# Cloud Run provides PORT (defaults to 8080); the server reads it via env.
EXPOSE 8080
CMD ["node", "server/dist/server.js"]
