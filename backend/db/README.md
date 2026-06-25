# Base de données — CinePick

## Fichiers

- `schema.sql` — état final attendu de la base (source de vérité, mise à jour à chaque changement)
- `migrations/` — scripts SQL à appliquer une seule fois, dans l'ordre chronologique

## Comment appliquer une migration

On n'utilise pas le CLI Supabase. Les migrations s'appliquent **manuellement via le SQL Editor** du dashboard Supabase.

### Procédure

1. Ouvre le [Supabase Dashboard](https://supabase.com/dashboard) → ton projet
2. Va dans **Database → SQL Editor**
3. Copie-colle le contenu du fichier de migration
4. Clique **Run**
5. Vérifie qu'il n'y a pas d'erreur dans le résultat
6. Note la migration comme appliquée (voir section ci-dessous)

### Environnements

Appliquer toujours dans cet ordre : **dev** → vérifier → **prod**

### Suivre les migrations appliquées

Tiens à jour ce tableau manuellement après chaque migration :

| Fichier | Dev | Prod | Date |
|---------|-----|------|------|
| `20260625_normalize_watchlist.sql` | ☐ | ☐ | — |

Coche la case après application.

## Comment créer une nouvelle migration

1. Crée un fichier dans `migrations/` avec le format `YYYYMMDD_description.sql`
2. Écris le SQL avec des gardes `IF NOT EXISTS` / `IF EXISTS` pour que la migration soit ré-exécutable sans erreur
3. Mets à jour `schema.sql` pour refléter l'état final
4. Ajoute une ligne dans le tableau ci-dessus

## Règles

- **Ne jamais modifier** un fichier de migration déjà appliqué — crée un nouveau fichier à la place
- **Toujours mettre à jour `schema.sql`** en même temps que la migration — il doit rester la photo de l'état attendu
- **Migrations idempotentes** — chaque script doit pouvoir être ré-exécuté sans erreur (utiliser `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, etc.)
