FROM node:18-alpine

WORKDIR /app

# Copy root lockfile and package.json for workspaces
COPY package.json yarn.lock ./
COPY backend/package.json ./package.json

RUN yarn install --production --frozen-lockfile

COPY backend/. .

EXPOSE 3001 3002
CMD ["yarn", "start"] 