FROM node:18-slim

WORKDIR /app

# Instalar dependências de sistema (FFmpeg, Python, OpenCV)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    espeak \
    libsndfile1 \
    sox \
    python3 \
    python3-pip \
    python3-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Instalar Python dependencies (OpenCV + NumPy)
RUN pip3 install --no-cache-dir \
    opencv-python-headless \
    numpy

COPY package*.json ./

RUN npm install --production

COPY . .

RUN mkdir -p uploads

EXPOSE 3000

CMD ["npm", "start"]
