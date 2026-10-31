#!/bin/bash
# Script sao chep tu dong cac file .env.example sang .env

echo "=================================================="
echo " Dang tao cac file .env tu .env.example..."
echo "=================================================="

copy_file() {
    src="$1"
    dst="$2"
    if [ -f "$src" ]; then
        cp -f "$src" "$dst"
        echo " [OK] Da sao chep: $src -> $dst"
    else
        echo " [WARN] Khong tim thay file: $src"
    fi
}

copy_file "web/.env.example" "web/.env"
copy_file "web/backend/.env.example" "web/backend/.env"
copy_file "web/web-admin/.env.example" "web/web-admin/.env"
copy_file "web/web-shop/.env.example" "web/web-shop/.env"

echo "=================================================="
echo " Hoan tat tao cac file .env!"
echo "=================================================="
