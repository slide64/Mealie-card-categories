# Installation du fork Mealie Card avec catégories

Cette variante ajoute une liste déroulante de catégories à la carte `custom:mealie-recipe-card`.

## Important

La variante conserve le même nom de carte que la version officielle. Il ne faut donc pas charger les deux fichiers JavaScript en même temps.

## Installation directe du fichier compilé

1. Copiez `dist/mealie-card.js` dans `/config/www/mealie-card-categories/mealie-card.js` sur Home Assistant.
2. Ouvrez **Paramètres > Tableaux de bord > Ressources**.
3. Supprimez ou désactivez la ressource de la version officielle installée par HACS.
4. Ajoutez une ressource de type **Module JavaScript** avec l'URL :

   ```text
   /local/mealie-card-categories/mealie-card.js?v=3
   ```

5. Rechargez complètement la page Home Assistant. Sur la tablette, fermez puis relancez Chromium si l'ancienne version reste en cache.

## Installation comme dépôt HACS personnalisé

1. Créez un nouveau dépôt GitHub à partir du contenu de cette archive.
2. Dans HACS, ouvrez le menu puis **Dépôts personnalisés**.
3. Ajoutez l'adresse de votre dépôt avec la catégorie **Dashboard**.
4. Recherchez ensuite **Mealie Card** dans HACS et installez-le.
5. N'installez pas simultanément le dépôt officiel `domodom30/mealie-card`.

## Configuration de la carte

Ajoutez simplement `show_categories: true` :

```yaml
type: custom:mealie-recipe-card
config_entry_id: VOTRE_CONFIG_ENTRY_ID
result_limit: 9999
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

La liste est remplie automatiquement avec les catégories présentes dans les recettes chargées. La recherche texte et la catégorie sélectionnée fonctionnent ensemble.

## Mise à jour après modification du code source

```bash
npm ci
npm run typecheck
npm run lint
npm run build
```

Le fichier à installer dans Home Assistant est ensuite `dist/mealie-card.js`.
