#!/bin/bash
# Script sao chep tu dong cac file .env.example sang .env trong thu muc web

echo "=================================================="
echo " Dang tao cac file .env tu .env.example trong web/..."
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

copy_file ".env.example" ".env"
copy_file "backend/.env.example" "backend/.env"
copy_file "web-admin/.env.example" "web-admin/.env"
copy_file "web-shop/.env.example" "web-shop/.env"

echo "=================================================="
echo " Hoan tat tao cac file .env trong web/!"
echo "=================================================="
