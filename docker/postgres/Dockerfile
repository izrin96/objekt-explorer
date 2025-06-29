# Custom postgres 17 image build with extension installed
FROM postgres:17

# Install build tools and PostgreSQL dev headers
RUN apt-get update && apt-get install -y \
    build-essential \
    postgresql-server-dev-17 \
    git \
    && rm -rf /var/lib/apt/lists/*

# Clone and build postgres-uuidv7-sql
RUN git clone https://github.com/dverite/postgres-uuidv7-sql.git /tmp/uuidv7 \
    && cd /tmp/uuidv7 \
    && make \
    && make install \
    && rm -rf /tmp/uuidv7

COPY init-db.sh /docker-entrypoint-initdb.d/init-db.sh
RUN chmod +x /docker-entrypoint-initdb.d/init-db.sh