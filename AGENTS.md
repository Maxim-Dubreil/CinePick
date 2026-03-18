# AGENTS.md — Instructions pour Claude Code

## Rôle
Tu es l'agent de développement de **CinePick**, une app mobile Expo (React Native + TypeScript) avec un backend FastAPI Python. Tu construis cette app feature par feature, en suivant TASKS.md.

---

## Règles absolues

### Avant chaque tâche
1. Lis la tâche dans `TASKS.md`
2. Lis `ARCHITECTURE.md` pour la structure de fichiers attendue
3. Lis `design/tokens.json` pour toutes les valeurs de design — **ne jamais hardcoder couleurs, fonts, spacing**
4. Vérifie si des fichiers existants sont à modifier plutôt que recréer

### Pendant le développement
- **Un fichier = une responsabilité** : composant, service, screen, types — jamais mélanger
- **TypeScript strict** : types explicites partout, pas de `any` sauf exception justifiée
- **Design tokens obligatoires** : toutes les valeurs visuelles viennent de `design/tokens.json` via le hook `useTheme()`
- **Pas de style inline hardcodé** : `color: "#fff"` est interdit, utilise `theme.colors.text`
- **Gestion d'erreur** : chaque appel API a son try/catch avec état d'erreur visible dans l'UI
- **Commentaires** : uniquement sur la logique complexe, pas sur l'évident

### Après chaque tâche
1. Marque la tâche comme `[x]` dans `TASKS.md`
2. Liste les fichiers créés/modifiés
3. Indique comment tester manuellement

---

## Structure des commits (si git)
```
feat: [TASK-XX] description courte
fix: [TASK-XX] description du fix
refactor: [TASK-XX] ce qui a changé
```

---

## Commandes utiles

```bash
# Backend
cd backend && uvicorn main:app --reload --port 8000

# App
cd app && npx expo start

# Vérifier les types
cd app && npx tsc --noEmit

# Tests backend
cd backend && pytest
```

---

## Priorités en cas de conflit
1. `TASKS.md` (quoi faire)
2. `ARCHITECTURE.md` (comment structurer)
3. `design/tokens.json` (comment styler)
4. `PRD.md` (pourquoi / intention produit)

---

## Ce que tu ne fais PAS
- Tu ne réinventes pas la structure — tu suis `ARCHITECTURE.md`
- Tu ne proposes pas de features non listées dans `PRD.md` sans demander
- Tu ne modifies pas `design/tokens.json` — c'est la source de vérité du thème
- Tu n'installes pas de librairies non listées dans `ARCHITECTURE.md` sans justification
