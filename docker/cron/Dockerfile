FROM alpine:latest

RUN apk add --no-cache curl busybox-suid

COPY crontab.txt /etc/crontabs/root

CMD ["crond", "-f"]