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

### Environnements

Appliquer toujours dans cet ordre : **dev** → vérifier → **prod** (changer de projet avec `supabase link --project-ref <ref>`).

## Règles

- **Ne jamais modifier** un fichier de migration déjà appliqué — créer un nouveau fichier à la place
- **Toujours mettre à jour `schema.sql`** en même temps que la migration
