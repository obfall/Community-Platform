#!/bin/bash
set -e

# 初回コンテナ起動時のみ実行される（postgres_data ボリュームが空のとき）
# ボリュームを wipe したあと再現できるよう、必要な DB と拡張をここに集約

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS pgroonga;
EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE DATABASE community_e2e;
EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname community_e2e <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS pgroonga;
EOSQL
