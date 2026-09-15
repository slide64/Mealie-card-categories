import type { MealieRecipe, MealieRecipeCardConfig, RecipeLike, ValueChangedEvent } from '../types';
import { html, nothing, TemplateResult } from 'lit';
import { state } from 'lit/decorators.js';
import { DEFAULT_RECIPE_CONFIG, DEFAULT_RESULT_LIMIT, FAVORITES_FETCH_LIMIT, normalizeRecipeConfig } from '../config.card.js';
import { getMealieRecipes, getRecipeFavorites } from '../utils/mealie-api.js';
import { FAVORITE_TOGGLED, RECIPE_RATED, RECIPES_UPDATED, subscribeMealieEvent, type MealieSignalName, type Unsubscribe } from '../utils/events.js';
import { MealieBaseCard } from './base-card';
import type { CardAction } from '../utils/recipe-render-mixin.js';
import './recipes-card-editor';
import './recipe-dialog';
import './mealplan-dialog';
import './recipe-search';
import './recipe-import-dialog';
import './shopping-list-dialog';

const SEARCH_DEBOUNCE_MS = 300;

export class MealieRecipeCard extends MealieBaseCard {
  @state() protected config!: MealieRecipeCardConfig;
  @state() private recipes: MealieRecipe[] = [];
  @state() private _mealplanRecipe: MealieRecipe | null = null;
  @state() private _dialogRecipe: RecipeLike | null = null;
  @state() private _searchQuery = '';
  @state() private _selectedCategory = '';
  @state() private _importDialogOpen = false;
  @state() private _shoppingRecipe: RecipeLike | null = null;

  private _searchDebounce: ReturnType<typeof setTimeout> | null = null;
  private _favoriteRecipesCache: MealieRecipe[] | null = null;
  private _favoriteIdsCache: Set<string> | null = null;

  protected refreshSignal(): MealieSignalName {
    return RECIPES_UPDATED;
  }

  protected subscribeExtras(): Unsubscribe[] {
    return [
      subscribeMealieEvent(RECIPE_RATED, ({ slug, rating }) => {
        this.recipes = this.recipes.map((r) => (r.slug === slug ? { ...r, rating } : r));
      }),
      subscribeMealieEvent(FAVORITE_TOGGLED, ({ slug, favorite }) => {
        this._favoriteIdsCache = null;
        if (this._favorites.get(slug) !== favorite) {
          this._favorites = new Map(this._favorites).set(slug, favorite);
        }
        if (this.config?.show_favorites_only && this._favoriteRecipesCache) {
          this.recipes = this._visibleFavoriteRecipes();
        }
      }),
    ];
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._searchDebounce) {
      clearTimeout(this._searchDebounce);
      this._searchDebounce = null;
    }
  }

  public setConfig(config: MealieRecipeCardConfig): void {
    this.config = normalizeRecipeConfig(config);
    if (!this.config.show_categories) this._selectedCategory = '';
    this._reload();
  }

  protected watchedEntityIds(): string[] {
    return this.findMealieEntities('sensor').filter((id) => id.endsWith('_recipes'));
  }

  protected itemCount(): number {
    return this._filteredRecipes().length;
  }

  protected hasOpenDialog(): boolean {
    return !!this._dialogRecipe || !!this._mealplanRecipe || !!this._shoppingRecipe || this._importDialogOpen;
  }

  private _invalidateFavoriteCaches(): void {
    this._favoriteRecipesCache = null;
    this._favoriteIdsCache = null;
  }

  protected override _reload(): void {
    this._invalidateFavoriteCaches();
    super._reload();
  }

  protected async fetchData(): Promise<void> {
    this.recipes = this.config.show_favorites_only && this.supports('favorites') ? await this._loadFavoriteRecipes() : await this._loadAllRecipes();

    if (this._selectedCategory && !this._categories().some((category) => category.slug === this._selectedCategory)) {
      this._selectedCategory = '';
    }
  }

  private async _favoriteIds(): Promise<Set<string>> {
    if (!this.supports('favorites')) return new Set();
    if (!this._favoriteIdsCache) {
      const favs = await getRecipeFavorites(this.hass, this.config.config_entry_id ?? undefined);
      this._favoriteIdsCache = new Set(favs.map((f) => f.recipe_id));
    }
    return this._favoriteIdsCache;
  }

  private async _loadFavoriteRecipes(): Promise<MealieRecipe[]> {
    if (!this._favoriteRecipesCache) {
      const favIds = await this._favoriteIds();
      const allRecipes = await getMealieRecipes(this.hass, {
        configEntryId: this.config.config_entry_id ?? undefined,
        resultLimit: FAVORITES_FETCH_LIMIT,
      });
      this._favoriteRecipesCache = allRecipes.filter((r) => favIds.has(r.recipe_id ?? ''));

      if (this.config.show_favorite) {
        this._favorites = new Map(this._favoriteRecipesCache.map((r) => [r.slug, true]));
      }
    }
    return this._visibleFavoriteRecipes();
  }

  private _visibleFavoriteRecipes(): MealieRecipe[] {
    const cached = this._favoriteRecipesCache ?? [];
    return this._applyFavoriteSearch(cached.filter((r) => this._favorites.get(r.slug) !== false));
  }

  private async _loadAllRecipes(): Promise<MealieRecipe[]> {
    const recipes = await getMealieRecipes(this.hass, {
      configEntryId: this.config.config_entry_id ?? undefined,
      resultLimit: this.config.result_limit ?? DEFAULT_RESULT_LIMIT,
      search: this._searchQuery || undefined,
    });

    if (this.config.show_favorite && this.supports('favorites')) {
      const favIds = await this._favoriteIds();
      this._favorites = new Map(recipes.map((r) => [r.slug, favIds.has(r.recipe_id ?? '')]));
    }
    return recipes;
  }

  private _applyFavoriteSearch(list: MealieRecipe[]): MealieRecipe[] {
    const query = this._searchQuery.toLowerCase();
    return query ? list.filter((r) => r.name?.toLowerCase().includes(query)) : list;
  }

  private _categories(): Array<{ name: string; slug: string }> {
    const categories = new Map<string, { name: string; slug: string }>();

    for (const recipe of this.recipes) {
      for (const category of recipe.categories ?? []) {
        if (category.slug && category.name) {
          categories.set(category.slug, { name: category.name, slug: category.slug });
        }
      }
    }

    return [...categories.values()].sort((a, b) =>
      a.name.localeCompare(b.name, this.hass?.locale?.language ?? 'fr', { sensitivity: 'base' })
    );
  }

  private _filteredRecipes(): MealieRecipe[] {
    if (!this._selectedCategory) return this.recipes;

    return this.recipes.filter((recipe) => recipe.categories?.some((category) => category.slug === this._selectedCategory));
  }

  private _onCategoryChanged(event: Event): void {
    this._selectedCategory = (event.target as HTMLElement & { value?: string }).value ?? '';
  }

  private _onSearch(value: string): void {
    this._searchQuery = value;

    if (this.config.show_favorites_only && this._favoriteRecipesCache) {
      this.recipes = this._visibleFavoriteRecipes();
      return;
    }

    if (this._searchDebounce) clearTimeout(this._searchDebounce);
    this._searchDebounce = setTimeout(() => this._reload(), SEARCH_DEBOUNCE_MS);
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement('mealie-recipe-card-editor');
  }

  public static getStubConfig(): MealieRecipeCardConfig {
    return { ...DEFAULT_RECIPE_CONFIG } as MealieRecipeCardConfig;
  }

  protected render() {
    if (!this.config) return this.renderLoading();
    if (!this.config.config_entry_id) return this.renderEmptyState(this.localize('error.no_integration'));

    return html`${this._renderCardShell(this._renderContent())} ${this._renderDialogs()}`;
  }

  private _renderContent(): TemplateResult {
    if (this.error) return this.renderErrorAlert();

    const hasRecipes = !!this.recipes?.length;
    if ((this._loading || !this._initialized) && !hasRecipes) return this.renderLoadingIndicator();
    if (!hasRecipes) return html`<ha-alert alert-type="info">${this.localize('common.no_recipe')}</ha-alert>`;

    const filteredRecipes = this._filteredRecipes();

    return html`<div class="recipes-wrapper" aria-busy=${this._loading ? 'true' : 'false'}>
      ${filteredRecipes.length
        ? html`<div class="recipes-container">${filteredRecipes.map((recipe) => this._renderRecipe(recipe))}</div>`
        : html`<ha-alert alert-type="info">${this.localize('common.no_recipe_category')}</ha-alert>`}
    </div>`;
  }

  private _renderDialogs() {
    return html`
      <mealie-mealplan-dialog
        .hass=${this.hass}
        .recipe=${this._mealplanRecipe}
        .configEntryId=${this.config.config_entry_id}
        .effectiveUrl=${this.config.url}
        ?open=${!!this._mealplanRecipe}
        @dialog-closed=${() => {
          this._mealplanRecipe = null;
        }}
      ></mealie-mealplan-dialog>
      <mealie-recipe-dialog
        .hass=${this.hass}
        .recipe=${this._dialogRecipe}
        .configEntryId=${this.config.config_entry_id}
        .config=${this.config}
        .isFavorite=${this._dialogRecipe?.slug ? (this._favorites.get(this._dialogRecipe.slug) ?? false) : null}
        .defaultShoppingListId=${this.config.default_shopping_list_id ?? null}
        ?open=${!!this._dialogRecipe}
        @dialog-closed=${() => {
          this._dialogRecipe = null;
        }}
      ></mealie-recipe-dialog>
      <mealie-recipe-import-dialog
        .hass=${this.hass}
        .configEntryId=${this.config.config_entry_id}
        ?open=${this._importDialogOpen}
        @dialog-closed=${() => {
          this._importDialogOpen = false;
        }}
      ></mealie-recipe-import-dialog>
      <mealie-shopping-list-dialog
        .hass=${this.hass}
        .recipe=${this._shoppingRecipe}
        .configEntryId=${this.config.config_entry_id}
        .defaultShoppingListId=${this.config.default_shopping_list_id ?? null}
        ?open=${!!this._shoppingRecipe}
        @dialog-closed=${() => {
          this._shoppingRecipe = null;
        }}
      ></mealie-shopping-list-dialog>
    `;
  }

  private _renderCardShell(content: TemplateResult) {
    return html`
      <ha-card>
        <div class="card-content">${this._renderToolbar()} ${content}</div>
      </ha-card>
    `;
  }

  private _renderToolbar(): TemplateResult | typeof nothing {
    const showSearch = this.config.show_search ?? false;
    const showCategories = (this.config.show_categories ?? false) && this._categories().length > 0;
    const showImport = this.config.show_import_button && this.supports('import_recipe');
    if (!showSearch && !showCategories && !showImport) return nothing;

    return html`
      <div class="card-toolbar">
        ${showSearch
          ? html`<mealie-recipe-search
              .value=${this._searchQuery}
              .placeholder=${this.localize('common.search_placeholder')}
              @search-changed=${(e: ValueChangedEvent<string>) => this._onSearch(e.detail.value)}
            ></mealie-recipe-search>`
          : nothing}
        ${showCategories
          ? html`<ha-select
              class="category-select"
              .label=${this.localize('common.category')}
              .value=${this._selectedCategory}
              @selected=${this._onCategoryChanged}
              @closed=${(event: Event) => event.stopPropagation()}
            >
              <ha-list-item value="">${this.localize('common.all_categories')}</ha-list-item>
              ${this._categories().map(
                (category) => html`<ha-list-item .value=${category.slug}>${category.name}</ha-list-item>`
              )}
            </ha-select>`
          : nothing}
        ${showImport
          ? html`<ha-icon-button
                    .label=${this.localize('dialog.import_recipe')}
                    @click=${() => {
                      this._importDialogOpen = true;
                    }}
                  >
                    <ha-icon icon="mdi:cloud-download"></ha-icon>
                  </ha-icon-button>`
          : nothing}
      </div>
    `;
  }

  private _recipeActions(recipe: MealieRecipe): CardAction[] {
    const actions: CardAction[] = [
      {
        className: 'add-to-mealplan-button',
        labelKey: 'dialog.add_to_mealplan',
        icon: 'mdi:calendar-plus',
        onClick: () => {
          this._mealplanRecipe = recipe;
        },
      },
    ];
    if (this.supports('shopping_list')) {
      actions.push({
        className: 'shopping-list-button',
        labelKey: 'dialog.add_to_shopping_list',
        icon: 'mdi:cart-plus',
        onClick: () => {
          this._shoppingRecipe = recipe;
        },
      });
    }
    actions.push({
      className: 'view-recipe-button',
      labelKey: 'cards.view_recipe',
      icon: 'mdi:book-open-variant',
      onClick: () => {
        if (this.openRecipe(recipe)) this._dialogRecipe = recipe;
      },
    });
    return actions;
  }

  private _renderRecipeInfo(recipe: MealieRecipe): TemplateResult {
    return html`
      <div class="recipe-title">${this.renderRecipeName(recipe)}</div>
      <div class="recipe-meta">
        ${this.renderFavoriteButton(recipe, this.config.show_favorite ?? false, this.config.config_entry_id)}
        ${this._renderInteractiveRating(recipe, this.config.show_rating, this.config.config_entry_id)}
        ${this.renderServings(recipe.recipe_servings, this.config.show_servings)}
      </div>
      ${this.renderRecipeDescription(recipe.description ?? '', this.config.show_description)}
    `;
  }

  private _renderRecipe(recipe: MealieRecipe): TemplateResult {
    return html`
      <div class="recipe-card">
        ${this.renderRecipeMedia(recipe, this.config.show_image, this._recipeActions(recipe))} ${this._renderRecipeInfo(recipe)}
        ${this.renderRecipeTimes(recipe, this.config.show_prep_time, this.config.show_perform_time, this.config.show_total_time)}
      </div>
    `;
  }
}
