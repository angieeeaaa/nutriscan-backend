// suitability.js

const RULES = {
  diabetes: (n) => (n.sugars_100g ?? 0) <= 5,
  hypertension: (n) => (n.sodium_100g ?? 0) <= 0.6,
  high_cholesterol: (n) => (n['saturated-fat_100g'] ?? 0) <= 5,
  kidney_disease: (n) => (n.potassium_100g ?? 0) <= 200 && (n.phosphorus_100g ?? 0) <= 100,
};

const DIET_AND_ALLERGY_KEYWORDS = {
  nuts: ['nuts', 'almond', 'hazelnut', 'walnut', 'cashew', 'pistachio'],
  shellfish: ['shellfish', 'shrimp', 'crab', 'lobster'],
  dairy: ['milk', 'dairy', 'lactose', 'cheese', 'butter', 'cream'],
  eggs: ['egg'],
  gluten_free: ['wheat', 'gluten', 'barley', 'rye'],
  vegetarian: ['beef', 'pork', 'chicken', 'meat', 'fish', 'seafood', 'gelatin'],
  vegan: ['milk', 'egg', 'honey', 'beef', 'pork', 'chicken', 'meat', 'fish', 'seafood', 'gelatin', 'dairy', 'whey', 'casein'],
  halal: ['pork', 'lard', 'gelatin', 'alcohol', 'wine', 'beer'],
};

function containsWord(text, keyword) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`\\b${escaped}\\b`, 'i');
  return pattern.test(text);
}

function checkAllergiesAndDiets(product, selectedTags) {
  const allergenTags = (product.allergens_tags || []).map(a => a.toLowerCase());
  const traceTags = (product.traces_tags || []).map(a => a.toLowerCase());
  const ingredientsText = (product.ingredients_text || '').toLowerCase();

  const triggered = [];
  for (const tag of selectedTags) {
    const keywords = DIET_AND_ALLERGY_KEYWORDS[tag];
    if (!keywords) continue;

    const isTriggered = keywords.some(keyword => {
      if (tag === 'dairy' && keyword === 'butter' && /peanut\s+butter/i.test(ingredientsText)) {
        return false;
      }
      return (
        allergenTags.some(a => containsWord(a, keyword)) ||
        traceTags.some(t => containsWord(t, keyword)) ||
        containsWord(ingredientsText, keyword)
      );
    });
    if (isTriggered) triggered.push(tag);
  }
  return triggered;
}

function analyseSuitability(product, preferences) {
  const nutriments = product.nutriments || {};
  const tags = preferences || [];

  const failedRules = tags.filter(tag => {
    const rule = RULES[tag];
    return rule && !rule(nutriments);
  });

  const triggeredAllergens = checkAllergiesAndDiets(product, tags);

  return {
    product_name: product.product_name || 'Unknown product',
    is_suitable: failedRules.length === 0 && triggeredAllergens.length === 0,
    failed_rules: failedRules,
    triggered_allergens: triggeredAllergens,
  };
}

module.exports = { analyseSuitability, RULES };