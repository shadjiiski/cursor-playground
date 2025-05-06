# Build step
FROM node:18-alpine as build

WORKDIR /app

# Copy root workspace files
COPY package.json yarn.lock ./
COPY frontend/package.json ./frontend/package.json

# Install all dependencies (including dev dependencies)
RUN yarn install --frozen-lockfile

# Copy frontend source
COPY frontend/. ./frontend/

# Build the frontend
WORKDIR /app/frontend
RUN yarn build

# Serve with nginx
FROM nginx:alpine
COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"] 