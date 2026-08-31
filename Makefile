# Raccourcis pour l'equipe. `make` seul affiche l'aide.
.DEFAULT_GOAL := help
.PHONY: help dev prod build stop clean logs shell migrate backup

help: ## Affiche cette aide
	@grep -E '^[a-z-]+:.*?## ' $(MAKEFILE_LIST) | awk -F':.*?## ' '{printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

dev: ## Lance l'environnement de developpement (hot reload)
	docker compose --profile dev up

prod: ## Lance l'image de production
	docker compose --profile prod up --build -d

build: ## Reconstruit l'image de production sans la lancer
	docker compose --profile prod build

stop: ## Arrete tout en gardant la base
	docker compose --profile dev --profile prod down

clean: ## Arrete tout ET supprime la base (irreversible)
	docker compose --profile dev --profile prod down -v

logs: ## Suit les logs
	docker compose --profile dev --profile prod logs -f

shell: ## Ouvre un shell dans le conteneur de dev
	docker compose --profile dev exec web-dev sh

migrate: ## Genere une migration Drizzle depuis le schema
	docker compose --profile dev exec web-dev npx drizzle-kit generate

backup: ## Sauvegarde la base dans ./backups/
	@mkdir -p backups
	docker run --rm -v profilsactifs_db-data:/data -v $$(pwd)/backups:/backup \
		alpine sh -c "apk add --no-cache sqlite >/dev/null && \
		sqlite3 /data/profilsactifs.db \".backup /backup/profilsactifs-$$(date +%Y%m%d-%H%M%S).db\""
	@echo "Sauvegarde ecrite dans ./backups/"
