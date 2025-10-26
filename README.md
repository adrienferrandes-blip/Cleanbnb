# CleanBnB - Full Demo Project (Minimal)

Contenu:
- backend/ : Node.js + Express + SQLite (API)
- frontend/ : React (Vite) simple UI
- .env.example : variables à renseigner
- package.json (root) : convenience scripts
- docker-compose.yml : optionnel

### But
Ce projet est une **version minimale** prête à déployer pour tests et démonstration.
Sur Render, choisis le dépôt GitHub (uploade ce dossier dans un repo) puis crée un Web Service Node.

### Lancer localement (rapide)
```
# backend
cd backend
npm install
npm run init-db
npm run dev

# frontend (nouche fenêtre)
cd frontend
npm install
npm run dev
```

API backend par défaut: http://localhost:4000
Frontend par défaut: http://localhost:5173

