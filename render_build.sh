#!/usr/bin/env bash
# exit on error
set -o errexit

# --- Frontend ---
npm install
npm run build

# --- Python & backend ---
pip install --upgrade pip
pip install pipenv
pipenv install

# --- Base de datos (automático) ---
# 1) Si RESET_DB_ON_DEPLOY=1 y la BD tiene tablas → vaciar schema y dejarla lista para migraciones
# 2) Si no existe carpeta migrations → init + migrate + upgrade
# 3) Si existe migrations → solo upgrade

export FLASK_APP="${FLASK_APP:-src/app.py}"

if [ -n "$DATABASE_URL" ] && [ "${RESET_DB_ON_DEPLOY:-0}" = "1" ]; then
  echo "Comprobando si la base de datos tiene tablas (RESET_DB_ON_DEPLOY=1)..."
  pipenv run python - << 'PYRESET' || true
import os
import sys
url = os.environ.get("DATABASE_URL", "")
if url.startswith("postgres://"):
    url = url.replace("postgres://", "postgresql://", 1)
if not url:
    sys.exit(0)
try:
    import psycopg2
    conn = psycopg2.connect(url)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'")
    n = cur.fetchone()[0]
    cur.close()
    conn.close()
    if n > 0:
        print(f"Base de datos con {n} tablas. Recreando schema público...")
        conn = psycopg2.connect(url)
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute("DROP SCHEMA public CASCADE;")
        cur.execute("CREATE SCHEMA public;")
        cur.execute("GRANT ALL ON SCHEMA public TO public;")
        cur.close()
        conn.close()
        print("Schema recreado.")
    else:
        print("Base de datos ya vacía.")
except Exception as e:
    print("No se pudo comprobar/recrear la BD:", e, file=sys.stderr)
    sys.exit(1)
PYRESET
fi

if [ ! -d "migrations" ] || [ ! -f "migrations/alembic.ini" ]; then
  echo "No existe carpeta de migraciones. Ejecutando init, migrate y upgrade..."
  pipenv run init
  pipenv run migrate
  pipenv run upgrade
else
  echo "Aplicando migraciones existentes (upgrade)..."
  pipenv run upgrade
fi
