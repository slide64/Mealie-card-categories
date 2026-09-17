# Installer Mealie Card avec filtre par catégorie

Cette version modifiée de **Mealie Card** ajoute une liste déroulante permettant d’afficher uniquement les recettes d’une catégorie Mealie.

La vue « Toutes les catégories » n’est pas proposée : aucune recette n’est affichée avant la sélection d’une catégorie. Cela évite de charger une page contenant un très grand nombre de vignettes.

## Fonctionnalités ajoutées

- catégories récupérées automatiquement depuis les recettes Mealie ;
- liste déroulante compatible avec Home Assistant et Chromium en mode kiosque ;
- affichage uniquement après la sélection d’une catégorie ;
- recherche limitée aux recettes de la catégorie sélectionnée ;
- option `show_categories` disponible dans l’éditeur graphique et en YAML.

## Prérequis

- Home Assistant ;
- l’intégration Mealie déjà installée et configurée ;
- HACS pour l’installation recommandée ;
- une carte `custom:mealie-recipe-card` fonctionnelle.

> [!IMPORTANT]
> Ce fork conserve le même nom de carte que la version officielle. La version officielle et cette version ne doivent pas être chargées simultanément.

## Méthode 1 — Installation avec HACS

### 1. Retirer la version officielle

Si `domodom30/mealie-card` est déjà installé :

1. ouvrez **HACS** ;
2. ouvrez **Mealie Card** ;
3. utilisez le menu **⋮** puis **Désinstaller** ;
4. redémarrez Home Assistant si HACS le demande.

### 2. Ajouter ce dépôt comme dépôt personnalisé

1. Dans HACS, ouvrez le menu **⋮**.
2. Sélectionnez **Dépôts personnalisés**.
3. Dans **Dépôt**, saisissez :

   ```text
   https://github.com/VOTRE_COMPTE/mealie-card-categories
   ```

4. Choisissez la catégorie **Dashboard**.
5. Cliquez sur **Ajouter**.

> Le propriétaire du dépôt doit remplacer `VOTRE_COMPTE` par son nom d’utilisateur GitHub avant de publier ce guide.

### 3. Installer la carte

1. Recherchez **Mealie Card** dans HACS.
2. Vérifiez que la fiche ouverte correspond bien au dépôt personnalisé.
3. Cliquez sur **Télécharger**.
4. Rechargez Home Assistant.

HACS doit créer automatiquement une ressource semblable à :

```text
/hacsfiles/mealie-card-categories/mealie-card.js
```

## Méthode 2 — Installation manuelle

### 1. Télécharger le fichier

Téléchargez `mealie-card.js` depuis la dernière version publiée dans la section **Releases** du dépôt GitHub.

### 2. Copier le fichier dans Home Assistant

Créez le dossier suivant :

```text
/config/www/mealie-card-categories/
```

Copiez ensuite le fichier ici :

```text
/config/www/mealie-card-categories/mealie-card.js
```

### 3. Déclarer la ressource

Dans Home Assistant :

1. ouvrez **Paramètres → Tableaux de bord** ;
2. ouvrez le menu **⋮ → Ressources** ;
3. cliquez sur **Ajouter une ressource** ;
4. utilisez l’adresse :

   ```text
   /local/mealie-card-categories/mealie-card.js?v=3
   ```

5. sélectionnez le type **Module JavaScript**.

Supprimez toute ancienne ressource pointant vers :

```text
/hacsfiles/mealie-card/mealie-card.js
```

## Configuration de la carte

Dans l’éditeur graphique, activez **Filtre par catégorie**.

En YAML, ajoutez :

```yaml
show_categories: true
```

Exemple complet :

```yaml
type: custom:mealie-recipe-card
config_entry_id: VOTRE_CONFIG_ENTRY_ID
result_limit: 100
show_search: true
show_categories: true
show_favorites_only: false
show_favorite: true
show_import_button: true
show_image: true
show_rating: true
show_servings: true
show_description: true
show_prep_time: true
show_perform_time: true
show_total_time: true
```

`result_limit` limite le nombre de recettes affichées après filtrage. Les catégories restent détectées à partir de l’ensemble des recettes chargées.

## Utilisation

Au premier affichage, la carte indique :

```text
Sélectionnez une catégorie pour afficher les recettes
```

Choisissez ensuite une catégorie dans la liste déroulante. Seules les recettes correspondantes sont affichées. La barre de recherche, lorsqu’elle est activée, filtre uniquement cette sélection.

## Mise à jour manuelle

1. téléchargez le nouveau `mealie-card.js` ;
2. remplacez l’ancien fichier ;
3. augmentez le numéro placé après `?v=` dans l’adresse de la ressource, par exemple :

   ```text
   /local/mealie-card-categories/mealie-card.js?v=4
   ```

4. rechargez complètement la page Home Assistant.

## Résolution des problèmes

### L’ancienne version reste affichée

- augmentez la valeur `?v=` dans l’adresse de la ressource ;
- rechargez avec `Ctrl + F5` sur ordinateur ;
- fermez puis relancez Chromium sur une tablette en mode kiosque.

### La liste des catégories n’apparaît pas

Vérifiez que la configuration contient :

```yaml
show_categories: true
```

Vérifiez également que les recettes possèdent bien des catégories dans Mealie.

### Erreur « Custom element already defined »

Deux versions de Mealie Card sont chargées simultanément. Supprimez la ressource de la version officielle ou celle de l’ancienne installation manuelle, puis rechargez Home Assistant.

## Projet d’origine

Cette variante est basée sur le projet [domodom30/mealie-card](https://github.com/domodom30/mealie-card), distribué sous licence MIT.
