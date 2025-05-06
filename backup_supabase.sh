#!/bin/bash

# === Supabase/Postgres Automated Backup Script ===
# Backs up the entire database (all tables) every 4 hours
# Stores backups in $HOME/supabase_backups
# Keeps the last 30 days of backups (older files are deleted)
# Easy to restore with psql or Supabase dashboard

# === CONFIGURATION ===
BACKUP_DIR="$HOME/supabase_backups"
# Connection string is now read from the SUPABASE_CONN_STRING environment variable for security.
CONN_STRING="$SUPABASE_CONN_STRING"
DATE=$(date +"%Y-%m-%d_%H-%M")
BACKUP_FILE="$BACKUP_DIR/supabase_backup_$DATE.sql"
RETENTION_DAYS=30

# === CREATE BACKUP DIR IF NEEDED ===
mkdir -p "$BACKUP_DIR"

# === RUN BACKUP ===
pg_dump "$CONN_STRING" --no-owner --no-privileges > "$BACKUP_FILE"
if [ $? -eq 0 ]; then
  echo "[$(date)] Backup successful: $BACKUP_FILE"
else
  echo "[$(date)] Backup FAILED!" >&2
  exit 1
fi

# === PRUNE OLD BACKUPS ===
find "$BACKUP_DIR" -type f -name "*.sql" -mtime +$RETENTION_DAYS -delete

# === USAGE ===
# 1. Make this script executable: chmod +x backup_supabase.sh
# 2. Add to crontab for every 4 hours:
#    0 */4 * * * /absolute/path/to/backup_supabase.sh >> $HOME/supabase_backups/backup.log 2>&1
# 3. Restore with:
#    psql "postgresql://YOUR_USER:YOUR_PASSWORD@YOUR_HOST:5432/YOUR_DB" < /path/to/supabase_backup_YYYY-MM-DD_HH-MM.sql 