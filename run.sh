#!/usr/bin/env bash

# Iniciar MariaDB si está apagado
echo "Verificando base de datos..."
sudo systemctl start mariadb

# Función para apagar MariaDB al presionar Ctrl + C
cleanup() {
    echo -e "\nDeteniendo servidor web y MariaDB..."
    sudo systemctl stop mariadb
    echo "Todo apagado limpiamente."
    exit 0
}
trap cleanup SIGINT

echo "Iniciando servidor en http://127.0.0.1:8000/public/ ..."
php -S 127.0.0.1:8000