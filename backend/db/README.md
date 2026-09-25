# Base de données — CinePick

## Fichiers

- `schema.sql` — état final attendu de la base (source de vérité lisible par un humain, mise à jour à chaque changement de schéma)
- `supabase/migrations/` (racine du projet) — scripts SQL versionnés gérés par le CLI Supabase

## Workflow migration

Les migrations sont gérées via le [CLI Supabase](https://supabase.com/docs/guides/cli).

### Créer une migration

```bash
supabase migration new nom_de_la_migration
```

Crée `supabase/migrations/YYYYMMDDHHmmss_nom_de_la_migration.sql`. Écrire le SQL dedans, puis mettre à jour `schema.sql`.

### Appliquer sur dev

```bash
supabase db push
```

### Vérifier l'état

```bash
supabase migration list
```

Affiche les migrations locales vs appliquées sur la base distante.

### Appliquer sur prod

```bash
make db-push-prod
```

Lit le mot de passe de la base prod dans `supabase/.env.prod` (`SUPABASE_PROD_DB_PASSWORD`, ignoré par git, à garder sur ta machine uniquement), ou le demande en saisie masquée si le fichier est absent ou vide. Liste ensuite les migrations en attente, demande confirmation, applique, puis lint le schéma.

### Environnements

Appliquer toujours dans cet ordre : **dev** (`supabase db push`) → vérifier → **prod** (`make db-push-prod`).

Le repo reste lié (`supabase link`) au projet **dev** : ne pas le relier à la prod. Le hook pre-commit (`make verify-db`) fait son dry-run contre le projet lié, il tournerait sinon contre la prod à chaque commit. La prod est atteinte via une URL de connexion explicite (`scripts/db-push-prod.sh`).

## Règles

- **Ne jamais modifier** un fichier de migration déjà appliqué — créer un nouveau fichier à la place
- **Toujours mettre à jour `schema.sql`** en même temps que la migration
