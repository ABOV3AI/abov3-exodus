#!/bin/bash
# ========================================
# PostgreSQL Primary Node Initialization
# ========================================
#
# This script runs on first startup of the primary node to:
# 1. Create a replication user for read replicas
# 2. Configure pg_hba.conf for replication access
# 3. Set up initial database permissions
#

set -e

# Create replication user
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create replication user with replication privileges
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'replicator') THEN
            CREATE USER replicator WITH REPLICATION ENCRYPTED PASSWORD '${REPLICATION_PASSWORD:-replicator_password}';
        END IF;
    END
    \$\$;

    -- Grant necessary permissions
    GRANT CONNECT ON DATABASE $POSTGRES_DB TO replicator;

    -- Log successful setup
    SELECT 'Replication user created successfully' as status;
EOSQL

# Configure pg_hba.conf for replication
# This allows the replica to connect for streaming replication
cat >> "$PGDATA/pg_hba.conf" <<EOF

# Replication connections from replica containers
host    replication     replicator      0.0.0.0/0               scram-sha-256
host    all             all             0.0.0.0/0               scram-sha-256
EOF

echo "Primary PostgreSQL initialized for HA replication"
