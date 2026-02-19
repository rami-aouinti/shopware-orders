# Shopware Orders – Guide projet

Ce dépôt contient une instance Shopware 6 orientée gestion de commandes avec plusieurs plugins métiers (notamment pour les commandes externes et la gestion des délais de livraison).

## Prérequis

- Docker + Docker Compose
- `make`
- (optionnel) `composer` si vous voulez exécuter des commandes localement hors conteneur

## Démarrage rapide

Depuis la racine du projet :

```bash
make up
make setup
```

Puis ouvrir le shell du conteneur web :

```bash
make shell
```

## Commandes `make` disponibles

Le `Makefile` fournit les commandes suivantes :

- `make up` : démarre les conteneurs Docker en arrière-plan.
- `make stop` : stoppe les conteneurs sans les supprimer.
- `make down` : stoppe et supprime les conteneurs.
- `make shell` : ouvre un shell bash dans le conteneur `web`.
- `make watch-storefront` : lance le mode watch pour le storefront.
- `make watch-admin` : lance le mode watch pour l’administration Shopware.
- `make build-storefront` : build des assets storefront.
- `make build-administration` : build des assets administration.
- `make setup` : installe les dépendances Composer puis installe Shopware (création + reset DB).

Astuce : `make` (sans argument) exécute la cible par défaut `help`.

## Plugins présents dans `custom/plugins`

### 1) ExternalOrders
- **Nom technique** : `ExternalOrders`
- **Objectif** : fournir une vue centrale des commandes externes (marketplaces) dans l’administration.
- **Fonctionnel** : filtres par canal, recherche, détails de commande, indicateurs agrégés, historique de statut.

### 2) LieferzeitenAdmin
- **Nom technique** : `LieferzeitenAdmin`
- **Objectif** : module d’administration pour piloter les délais de livraison.
- **Fonctionnel** : suivi des commandes et tâches, synchronisation, endpoints d’édition, statistiques, notifications, données de démonstration.

### 3) Lieferzeit
- **Nom technique** : `Lieferzeit`
- **Objectif** : plugin complémentaire orienté administration des délais de livraison.
- **Fonctionnel** : base de module Lieferzeit (structure plugin Shopware, label multi-langue).

### 4) SwagExtensionStore
- **Nom technique** : `SwagExtensionStore`
- **Objectif** : accès au Store Shopware depuis l’administration.
- **Fonctionnel** : découverte et intégration d’extensions/thèmes.

### 5) SwagPlatformDemoData
- **Nom technique** : `SwagPlatformDemoData`
- **Objectif** : injection de données de démonstration Shopware.
- **Attention** : à ne pas utiliser en production (écrasement possible de données existantes).

### 6) SwagPayPal
- **Nom technique** : `SwagPayPal`
- **Objectif** : intégration des moyens de paiement PayPal dans Shopware 6.
- **Fonctionnel** : prise en charge des options PayPal (checkout, express, etc.).

## Commandes utiles pour les plugins

Lister les plugins installés/connus :

```bash
bin/console plugin:list
```

Rafraîchir, installer et activer un plugin :

```bash
bin/console plugin:refresh
bin/console plugin:install --activate <NomTechniquePlugin>
```

Mettre à jour un plugin :

```bash
bin/console plugin:update <NomTechniquePlugin>
```

Exécuter les migrations :

```bash
bin/console database:migrate --all
```

## Structure principale

- `custom/plugins/` : plugins Shopware du projet.
- `bin/` : scripts utilitaires (build admin/storefront, console, watch).
- `config/` : configuration Symfony / Shopware.
- `public/` : point d’entrée web.

---

Si vous le souhaitez, je peux ensuite enrichir ce README avec un **runbook d’exploitation** (debug, logs, queue, scheduled tasks, commandes de diagnostic) en version courte ou détaillée.
