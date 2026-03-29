# Honey Production Dashboard — Documentation

## Table des matières
1. [Présentation du projet](#1-présentation-du-projet)
2. [Architecture générale](#2-architecture-générale)
3. [Choix technologiques](#3-choix-technologiques)
4. [Structure des fichiers](#4-structure-des-fichiers)
5. [Modèle de données](#5-modèle-de-données)
6. [API — Endpoints](#6-api--endpoints)
7. [Fonctionnalités du dashboard](#7-fonctionnalités-du-dashboard)
8. [Lancer le projet en local](#8-lancer-le-projet-en-local)
9. [Déploiement sur Render](#9-déploiement-sur-render)

---

## 1. Présentation du projet

Le **Honey Production Dashboard** est une application web de gestion et de visualisation de données pour un producteur de miel au Burkina Faso. Elle permet de :

- Enregistrer les **récoltes** de miel par mois (en litres)
- Visualiser la **production** par semestre sous forme de graphiques
- Gérer les **commandes** clients avec suivi du statut de livraison
- Calculer automatiquement les **ventes** en FCFA à partir des commandes livrées
- Filtrer les ventes **par année** ou sur **toutes les années**
- Suivre les indicateurs clés (KPIs) : production totale, ventes, bouteilles livrées, commandes en attente

Le prix de référence est **2 500 FCFA par bouteille de 0,5 litre**, soit **5 000 FCFA par litre**.

---

## 2. Architecture générale

Le projet suit une architecture **client-serveur** à trois couches :

```
┌─────────────────────────────────────┐
│           Navigateur web            │
│  HTML + CSS + JavaScript (Chart.js) │
│         (couche présentation)        │
└────────────────┬────────────────────┘
                 │ requêtes HTTP (fetch API)
┌────────────────▼────────────────────┐
│         Serveur Flask (Python)       │
│         Routes + logique métier      │
│         (couche application)         │
└────────────────┬────────────────────┘
                 │ requêtes SQL
┌────────────────▼────────────────────┐
│          Base de données SQLite      │
│       Tables : honey, orders         │
│         (couche données)             │
└─────────────────────────────────────┘
```

Le frontend communique avec le backend via des **requêtes HTTP asynchrones** (`fetch`). Le backend répond en **JSON**. La base de données est un fichier local (`honey.db`).

---

## 3. Choix technologiques

### 3.1 Python + Flask (backend)

**Flask** est un micro-framework web Python léger et simple à prendre en main.

| Critère | Justification |
|---|---|
| Légèreté | Flask n'impose pas de structure rigide, idéal pour un projet de taille moyenne |
| Rapidité de développement | Quelques lignes suffisent pour créer une API REST fonctionnelle |
| Compatibilité Python | Permet d'utiliser directement le module `sqlite3` intégré à Python |
| Déploiement facile | Compatible avec Render sans configuration complexe |

Alternative écartée : **Django** — trop lourd pour ce projet, conçu pour des applications bien plus grandes.

---

### 3.2 SQLite (base de données)

**SQLite** est une base de données relationnelle stockée dans un seul fichier (`honey.db`).

| Critère | Justification |
|---|---|
| Zéro configuration | Pas de serveur à installer, intégré à Python (`import sqlite3`) |
| Adapté au volume de données | Pour un producteur individuel, les volumes sont faibles |
| Portabilité | La base entière est un seul fichier, facile à sauvegarder |
| Fiabilité | SQLite est l'une des bases de données les plus testées au monde |

Alternative écartée : **PostgreSQL** — plus puissant mais nécessite un serveur dédié, injustifié ici.

---

### 3.3 JavaScript vanilla + Fetch API (frontend)

Le frontend est écrit en **JavaScript natif**, sans framework (pas de React, Vue ou Angular).

| Critère | Justification |
|---|---|
| Simplicité | Pas de build tools, pas de `npm install` |
| Performance | Aucune librairie inutile, le site est rapide |
| Lisibilité | Code accessible à toute personne connaissant les bases du web |
| Fetch API | Communication asynchrone moderne avec le backend |

---

### 3.4 Chart.js (visualisation)

**Chart.js** est une bibliothèque JavaScript de création de graphiques.

| Critère | Justification |
|---|---|
| Facilité d'intégration | Une balise `<script>` suffit, pas d'installation |
| Qualité visuelle | Graphiques animés, responsifs, personnalisables |
| Légèreté | ~60 KB, bien plus léger que D3.js |

---

### 3.5 Gunicorn (serveur de production)

En développement, Flask utilise son serveur intégré. En production (sur Render), on utilise **Gunicorn**.

| Critère | Justification |
|---|---|
| Stabilité | Le serveur Flask intégré n'est pas conçu pour la production |
| Performance | Gunicorn gère plusieurs requêtes simultanées |
| Standard | C'est le serveur WSGI de référence pour Flask en production |

---

### 3.6 Render (hébergement)

**Render** est une plateforme cloud qui héberge des applications web.

| Critère | Justification |
|---|---|
| Gratuit | Le plan Free suffit pour un projet portfolio |
| Supporte Python/Flask | Contrairement à GitHub Pages (statique uniquement) |
| Déploiement automatique | À chaque `git push`, Render redéploie automatiquement |
| Simplicité | Connexion directe au repo GitHub |

---

## 4. Structure des fichiers

```
honey-dashboard/
│
├── app.py            # Serveur Flask — routes API et fichiers statiques
├── init_db.py        # Script d'initialisation de la base de données
├── honey.db          # Base de données SQLite (générée par init_db.py)
│
├── index.html        # Interface utilisateur (dashboard)
├── style.css         # Styles visuels (thème miel, responsive mobile)
├── script.js         # Logique frontend (fetch, graphiques, tableaux)
│
├── honey_data.json   # Fichier JSON original (remplacé par SQLite)
├── requirements.txt  # Dépendances Python (Flask, Gunicorn)
└── render.yaml       # Configuration de déploiement Render
```

---

## 5. Modèle de données

### Table `honey` — Récoltes

| Colonne | Type | Description |
|---|---|---|
| `id` | INTEGER | Identifiant unique (auto-incrémenté) |
| `year` | INTEGER | Année de la récolte |
| `month` | INTEGER | Mois de la récolte (1 à 12) |
| `production` | REAL | Quantité récoltée en litres |

Le **semestre** est calculé dynamiquement : mois 1–6 → S1, mois 7–12 → S2.

---

### Table `orders` — Commandes

| Colonne | Type | Description |
|---|---|---|
| `id` | INTEGER | Identifiant unique (auto-incrémenté) |
| `date` | TEXT | Date de la commande (YYYY-MM-DD) |
| `client` | TEXT | Nom du client |
| `quantity` | INTEGER | Nombre de bouteilles commandées (0,5 L) |
| `status` | TEXT | `en_attente` ou `livré` |

La **valeur** d'une commande est calculée : `quantity × 2 500 FCFA`.
Les ventes dans les graphiques et KPIs = **commandes livrées uniquement**.

---

## 6. API — Endpoints

### Récoltes

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/api/data` | Retourne toutes les récoltes avec semestre calculé |
| `POST` | `/api/data` | Ajoute une nouvelle récolte |

**Corps POST `/api/data` :**
```json
{
  "year": 2024,
  "month": 5,
  "production": 110.5
}
```

---

### Commandes

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/api/orders` | Retourne toutes les commandes avec valeur calculée |
| `POST` | `/api/orders` | Enregistre une nouvelle commande |
| `PATCH` | `/api/orders/<id>/deliver` | Marque une commande comme livrée |

**Corps POST `/api/orders` :**
```json
{
  "date": "2024-06-15",
  "client": "Marché de Ouaga",
  "quantity": 20
}
```

---

## 7. Fonctionnalités du dashboard

### KPIs (indicateurs clés)
Quatre cartes affichées en haut :
- **Production totale (L)** — toutes récoltes confondues
- **Ventes livrées (FCFA)** — uniquement les commandes au statut `livré`
- **Bouteilles livrées** — nombre total de bouteilles livrées
- **Commandes en attente** — nombre de commandes non encore livrées

### Graphique de production
Barres par semestre (S1/S2) — toujours affiché sur toutes les années.

### Graphique des ventes
- Toggle **Semestre / Mois** pour changer la granularité
- Filtre **par année** ou **toutes les années**
- Affiche tous les semestres ayant une récolte, même si les ventes sont à 0
- Les ventes reflètent uniquement les commandes livrées

### Gestion du stock
Carte affichée entre les KPIs et les graphiques, calculée automatiquement :

| Indicateur | Calcul |
|---|---|
| Bouteilles produites | `production totale (L) × 2` |
| Bouteilles livrées | somme des commandes au statut `livré` |
| Bouteilles réservées | somme des commandes au statut `en_attente` |
| **Bouteilles disponibles** | `produites − livrées − réservées` |

Une barre de progression colorée visualise la répartition du stock :
- **Vert foncé** = livrées
- **Orange** = réservées
- **Vert clair** = disponibles

Le stock se met à jour en temps réel dès qu'une commande est marquée livrée.

### Tableau des récoltes
Récapitulatif par semestre : production (L), nombre de bouteilles potentielles, valeur (FCFA).

### Section commandes
- Formulaire : date, client, quantité en bouteilles
- Tableau avec statut coloré : **jaune** = en attente, **vert** = livré
- Bouton **"Marquer livré"** : met à jour la base et recalcule les ventes en temps réel

---

## 8. Lancer le projet en local

### Prérequis
- Python 3.x installé
- Connexion internet (Chart.js via CDN)

### Installation

```bash
# 1. Installer les dépendances
python -m pip install flask

# 2. Créer la base de données
python init_db.py

# 3. Lancer le serveur
python app.py
```

Ouvrir le navigateur à l'adresse : `http://localhost:5000`

---

## 9. Déploiement sur Render

Le fichier `render.yaml` configure automatiquement le déploiement :

```yaml
services:
  - type: web
    name: honey-dashboard
    runtime: python
    buildCommand: "pip install -r requirements.txt && python init_db.py"
    startCommand: "gunicorn app:app"
    plan: free
```

- **buildCommand** : installe les dépendances et initialise la base de données
- **startCommand** : lance Gunicorn (serveur de production)

Le site est accessible à l'adresse : **https://honey-dashboard-0nw1.onrender.com**

À chaque `git push` sur la branche `main`, Render redéploie automatiquement.

---

## Technologies utilisées

| Technologie | Rôle |
|---|---|
| Python 3 | Langage backend |
| Flask | Framework web |
| SQLite | Base de données |
| Gunicorn | Serveur WSGI production |
| HTML5 / CSS3 | Structure et mise en page |
| JavaScript ES6+ | Logique frontend |
| Chart.js | Visualisation des données |
| Render | Hébergement cloud |
| GitHub | Versionnement du code |
