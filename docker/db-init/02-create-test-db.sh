#!/bin/bash
# Crée la base sheriff_test pour l'environnement de test (PHPUnit dans Docker).
# Utilisée par Doctrine quand APP_ENV=test (suffixe _test dans config/packages/doctrine.yaml).
set -e
psql -v ON_ERROR_STOP=1 --username "postgres" -c "CREATE DATABASE sheriff_test OWNER sheriff;" || true
