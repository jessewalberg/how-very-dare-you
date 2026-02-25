FROM golang:1.23-bookworm AS builder
WORKDIR /app
COPY go.mod ./
COPY *.go ./
RUN CGO_ENABLED=0 go build -o /video-analyzer .

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg python3-pip nodejs \
    && pip3 install --break-system-packages --upgrade yt-dlp \
    && apt-get clean && rm -rf /var/lib/apt/lists/*
COPY --from=builder /video-analyzer /video-analyzer
EXPOSE 8080
CMD ["/video-analyzer"]
