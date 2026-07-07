#!/usr/bin/env python3
"""
Upload a database backup file to Supabase Storage 'backups' bucket.
Used by GitHub Actions workflow `.github/workflows/database-backup.yml`.

Required environment variables:
  - SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY

Usage:
  python scripts/upload-backup.py <path-to-backup-file>
"""

import os
import sys
from pathlib import Path

try:
    import requests
except ImportError:
    print("Error: 'requests' is required. Install with: pip install requests")
    sys.exit(1)


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: upload-backup.py <path-to-backup-file>")
        return 1

    file_path = Path(sys.argv[1])
    if not file_path.exists():
        print(f"Error: File not found: {file_path}")
        return 1

    supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

    if not supabase_url:
        print("Error: SUPABASE_URL environment variable is not set")
        return 1
    if not service_role_key:
        print("Error: SUPABASE_SERVICE_ROLE_KEY environment variable is not set")
        return 1

    filename = file_path.name
    upload_url = f"{supabase_url}/storage/v1/object/backups/{filename}"

    # Detect content type
    suffix = file_path.suffix.lower()
    if suffix == ".gz":
        content_type = "application/gzip"
    elif suffix == ".sql":
        content_type = "application/sql"
    else:
        content_type = "application/octet-stream"

    headers = {
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type": content_type,
        "x-upsert": "true",  # Overwrite if file with same name exists
    }

    print(f"Uploading {file_path} ({file_path.stat().st_size} bytes) to {upload_url}")

    with open(file_path, "rb") as f:
        response = requests.post(upload_url, headers=headers, data=f, timeout=120)

    if response.status_code in (200, 201):
        data = response.json()
        print(f"Upload successful: {data.get('Key', filename)}")
        return 0
    else:
        print(f"Upload failed: HTTP {response.status_code}")
        print(response.text)
        return 1


if __name__ == "__main__":
    sys.exit(main())
