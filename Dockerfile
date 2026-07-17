FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production
EXPOSE 4173
CMD ["sh", "-c", "npm run preview -- --host 0.0.0.0 --port 4173"]
