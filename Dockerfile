FROM node:18-alpine

WORKDIR /app

# Instalar dependências de sistema (FFmpeg, Python)
RUN apk add --no-cache \
    ffmpeg \
    espeak \
    libsndfile \
    sox \
    python3 \
    py3-pip

# Instalar Python dependencies (OpenCV pré-compilado + NumPy)
RUN pip3 install --no-cache-dir \
    opencv-python-headless \
    numpy

COPY package*.json ./

RUN npm install --production

COPY . .

RUN mkdir -p uploads

EXPOSE 3000

CMD ["npm", "start"]
