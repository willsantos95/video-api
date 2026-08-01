FROM node:18-alpine

WORKDIR /app

# Instalar dependências de sistema (FFmpeg, Python, OpenCV)
RUN apk add --no-cache \
    ffmpeg \
    espeak \
    libsndfile \
    sox \
    python3 \
    py3-pip \
    gcc \
    musl-dev \
    linux-headers \
    g++ \
    make \
    cmake \
    jpeg-dev \
    png-dev \
    tiff-dev \
    openexr-dev \
    libwebp-dev \
    lapack-dev \
    openblas-dev

# Instalar Python dependencies (OpenCV + NumPy)
RUN pip3 install --no-cache-dir opencv-python numpy

COPY package*.json ./

RUN npm install --production

COPY . .

RUN mkdir -p uploads

EXPOSE 3000

CMD ["npm", "start"]
