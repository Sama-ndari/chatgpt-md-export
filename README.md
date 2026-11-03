# chatgpt-md-export

**Built by Samandari**

CLI qui exporte une conversation ChatGPT (URL) en Markdown propre, avec pièces jointes et payload JSON.

Objectif : passer le Markdown + `files/` à une autre IA, sans rescraper l’UI.

> **Non officiel** — sans lien avec OpenAI. Utilise les API privées de chatgpt.com. Le bearer token = secret (comme un mot de passe). Ne le committez jamais.

## Quick start

```bash
npm install
npm run build
cp .env.example .env
# Éditer .env → coller CHATGPT_BEARER_TOKEN

npm start -- "https://chatgpt.com/c/<conversation-id>"
```

Sortie typique :

```text
chatgpt-md-export v0.1.0 · built by Samandari
Exported: Mon titre
Author:   Sam
Markdown: .../exports/mon-titre-abcd1234/conversation.md
HTML:     .../exports/mon-titre-abcd1234/conversation.html
Files:    2 downloaded
Folder:   .../exports/mon-titre-abcd1234
```

## Résultat

```text
exports/
  mon-titre-abcd1234/
    conversation.md    # pour une autre IA / lecture texte
    conversation.html  # chat pliable — ouvrir dans le navigateur
    conversation.json  # payload brut API
    files/             # pièces jointes téléchargées
      screenshot.png
      notes.pdf
```

**Markdown** : format simple (`## Author` / `## Assistant`) pour les IA.  
**HTML** : vue chat (bulles, pliable). Ouvre `conversation.html` dans le navigateur.

## Prérequis

- Node.js **20+**
- Compte ChatGPT + bearer token (conversations privées / fichiers)

## Configuration

### 1. Fichier `.env` (recommandé)

```bash
cp .env.example .env
```

| Variable | Requis | Description |
| --- | --- | --- |
| `CHATGPT_BEARER_TOKEN` | Oui* | JWT session ChatGPT (`accessToken`) |
| `CHATGPT_ACCOUNT_ID` | Non | Compte équipe / enterprise (sinon déduit du JWT) |
| `CHATGPT_AUTHOR_NAME` | Non | Nom affiché dans le Markdown (défaut : `User` ou `-a`) |
| `CHATGPT_MD_EXPORT_ENV_FILE` | Non | Chemin absolu vers un autre fichier env |

\* Requis pour conversations **privées** et téléchargement de fichiers. Les partages publics peuvent marcher sans token.

`.env` est **gitignoré**. Ne poussez que `.env.example`.

### 2. Récupérer le token

1. Ouvrez [chatgpt.com/api/auth/session](https://chatgpt.com/api/auth/session) connecté → champ `accessToken`, **ou**
2. DevTools → Network → requête vers `chatgpt.com` → header `Authorization: Bearer …`

Le token expire : si vous voyez `AUTH_FAILED` / `AUTH_TOKEN_EXPIRED`, rafraîchissez-le.

### 3. Ordre de lecture des secrets

1. `CHATGPT_MD_EXPORT_ENV_FILE` (si défini)
2. `.env` à la racine du projet
3. `~/.config/chatgpt-md-export/env`
4. `~/.config/mcp-contexte-gpt/env` (réutilisation éventuelle)

Les variables déjà présentes dans l’environnement processus gagnent sur le fichier.

## Usage

```bash
# Dev (tsx, sans rebuild)
npm run dev -- "https://chatgpt.com/c/<id>"

# Après build
npm start -- "https://chatgpt.com/c/<id>"
# équivalent :
node dist/src/main.js "https://chatgpt.com/c/<id>"

# Options
npm start -- "https://chatgpt.com/c/<id>" -o ./exports -a "Sam"
npm start -- "https://chatgpt.com/share/<id>" --skip-files
```

| Option | Rôle |
| --- | --- |
| `-o, --out <dir>` | Dossier racine de sortie (défaut : `./exports`) |
| `-a, --author <name>` | Nom Author dans le Markdown |
| `--skip-files` | N’exporte pas les pièces jointes (placeholders dans le `.md`) |
| `-h, --help` | Aide |

Après `npm link` (ou install global du bin) :

```bash
chatgpt-md-export "https://chatgpt.com/c/<id>"
```

## URLs supportées

| Type | Exemple |
| --- | --- |
| Conversation privée | `https://chatgpt.com/c/{id}` |
| Partage | `https://chatgpt.com/share/{id}` |
| Partage (`/e/`) | `https://chatgpt.com/share/e/{id}` |
| Projet | `https://chatgpt.com/g/{project-slug}/c/{id}` |
| Projet partagé | `https://chatgpt.com/g/{slug}/shared/c/{id}?owner_user_id={owner}` |

Hosts : `chatgpt.com`, `chat.openai.com`.

## Ce qui est exporté

- Fil de messages (branche active, depuis `current_node`)
- Texte, blocs de code, multimodal
- Raisonnement / browsing / outils (quand présents dans le payload)
- Pièces jointes (`file-service://`, sediment, etc.) → `files/` + liens relatifs
- Si une PJ appartient à un autre compte (`user_mismatch`), l’export **continue** avec un placeholder clair

## Dépannage

| Symptôme | Piste |
| --- | --- |
| `AUTH_TOKEN_MISSING` | Remplir `CHATGPT_BEARER_TOKEN` dans `.env` |
| `AUTH_TOKEN_EXPIRED` / `AUTH_FAILED` | Nouveau token depuis la session ChatGPT |
| `UNSUPPORTED_URL` | Vérifier le format d’URL ci-dessus |
| Pièces jointes en échec | Token expiré, ou fichier d’un autre compte |
| `Attachment blocked (uploaded by another account)` | Normal si le patron a uploadé les docs : le share donne le texte, pas les fichiers. Export continue ; télécharge les PJ à la main ou avec le token uploader |
| Projet partagé 403/404 | Ajouter `owner_user_id` dans l’URL |

## Développement

```bash
npm test          # Vitest
npm run typecheck
npm run build
npm run check     # test + typecheck + build
```

Stack : TypeScript (ESM), Node 20+, **aucune dépendance runtime** (seulement `fetch` / `fs` natifs).

Structure :

```text
src/
  main.ts                 # CLI
  config/env-file.ts      # chargement .env / XDG
  chatgpt/                # auth, client API, URLs, fichiers
  export/                 # messages → Markdown + downloads
  shared/                 # erreurs, dates
tests/
```

## Licence

`UNLICENSED` — usage personnel / privé selon `package.json`.

Built by **Samandari**.
