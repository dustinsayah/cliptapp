FROM node:20-slim

# Install Chrome dependencies for Remotion
RUN apt-get update && apt-get install -y \
  chromium \
  fonts-liberation \
  fonts-noto \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libdrm2 \
  libgbm1 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxkbcommon0 \
  libxrandr2 \
  wget \
  xdg-utils \
  --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV REMOTION_CHROME_MODE=chrome-for-testing

WORKDIR /app

# Copy remotion compositions first (needed for bundling)
COPY remotion ./remotion

# Copy render server
COPY render-server/package.json ./package.json
RUN npm install

COPY render-server/tsconfig.json ./tsconfig.json
COPY render-server/server.ts ./server.ts
RUN npx tsc

EXPOSE 4000
CMD ["npm", "start"]
