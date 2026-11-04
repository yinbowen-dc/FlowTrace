FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY server.mjs adapters.mjs version.mjs ./
COPY agent ./agent
COPY auth ./auth
COPY mcp ./mcp
COPY watch ./watch
COPY payments ./payments
COPY wallet ./wallet
COPY public ./public
USER node
ENV HOST=0.0.0.0 PORT=8796 BASE_PATH=/collect
EXPOSE 8796
CMD ["node", "server.mjs"]
