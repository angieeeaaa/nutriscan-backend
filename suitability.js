// suitability.js

const RULES = {
  diabetes: (n) => (n.sugars_100g ?? 0) <= 5,
  hypertension: (n) => (n.sodium_100g ?? 0) <= 0.4,
  high_cholesterol: (n) => (n['saturated-fat_100g'] ?? 0) <= 5,
};

const ALLERGY_KEYWORDS = {
  nuts: ['nuts', 'almond', 'hazelnut', 'walnut', 'cashew', 'pistachio'],
  shellfish: ['shellfish', 'shrimp', 'crab', 'lobster'],
  dairy: ['milk', 'dairy', 'lactose', 'cheese', 'butter', 'cream'],
  eggs: ['egg'],
  gluten_free: ['wheat', 'gluten', 'barley', 'rye'],
};

function checkAllergiesAndDiets(product, selectedTags) {
  const allergenTags = (product.allergens_tags || []).map(a => a.toLowerCase());
  const traceTags = (product.traces_tags || []).map(a => a.toLowerCase());
  const ingredientsText = (product.ingredients_text || '').toLowerCase();

  const triggered = [];
  for (const tag of selectedTags) {
    const keywords = ALLERGY_KEYWORDS[tag];
    if (!keywords) continue;

    const isTriggered = keywords.some(keyword =>
      allergenTags.some(a => a.includes(keyword)) ||
      traceTags.some(t => t.includes(keyword)) ||
      ingredientsText.includes(keyword)
    );
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