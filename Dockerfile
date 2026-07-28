FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache \
    ffmpeg \
    espeak \
    libsndfile \
    sox

COPY package*.json ./

RUN npm install --production

COPY . .

RUN mkdir -p uploads

EXPOSE 3000

CMD ["npm", "start"]
