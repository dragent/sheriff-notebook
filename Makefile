# Bureau du Shérif Annesburg — cibles d'automatisation (Docker)
# Usage : make up | make db-setup | make db-migrate | make db-import | make db-link-users | make users-list

.PHONY: up down db-setup db-migrate db-import db-import-services db-link-users users-list

# Démarrer les services (build si besoin)
up:
	docker compose up --build -d

# Arrêter les services
down:
	docker compose down

# Initialisation complète BDD : migrations + import services
# À lancer une fois après le premier « docker compose up », ou après un clone.
db-setup: db-migrate db-import

# Exécuter les migrations Doctrine
db-migrate:
	docker compose exec backend php bin/console doctrine:migrations:migrate -n

# Import services (CSV / données initiales)
db-import: db-import-services

db-import-services:
	docker compose exec backend php bin/console app:import-services

# Lier les fiches de service aux comptes (par pseudo). Une fois après la migration « one service record per user ».
db-link-users:
	docker compose exec backend php bin/console app:link-service-records-to-users

# Lister les utilisateurs en base
users-list:
	docker compose exec backend php bin/console app:users:list
