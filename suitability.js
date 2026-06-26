// backend/suitability.js

// Each rule checks the product's nutriments object (per 100g) against a threshold
const RULES = {
  diabetes: (n) => (n.sugars_100g ?? 0) <= 5,
  hypertension: (n) => (n.sodium_100g ?? 0) <= 0.4, // sodium is in grams, not mg, in OFF data
  high_cholesterol: (n) => (n['saturated-fat_100g'] ?? 0) <= 5,
  low_calorie: (n) => (n['energy-kcal_100g'] ?? 0) <= 200,
};

// allergens_tags looks like ["en:milk", "en:nuts"] when present
function checkAllergies(product, userAllergies) {
  const allergenTags = (product.allergens_tags || []).map(a => a.toLowerCase());
  const traceTags = (product.traces_tags || []).map(a => a.toLowerCase());
  const ingredientsText = (product.ingredients_text || '').toLowerCase();

  return userAllergies.filter(allergy => {
    const a = allergy.toLowerCase();
    return (
      allergenTags.some(tag => tag.includes(a)) ||
      traceTags.some(tag => tag.includes(a)) ||
      ingredientsText.includes(a)
    );
  });
}

function analyseSuitability(product, userProfile) {
  const nutriments = product.nutriments || {};
  const conditions = userProfile.conditions || [];
  const allergies = userProfile.allergies || [];

  const failedRules = conditions.filter(condition => {
    const rule = RULES[condition];
    return rule && !rule(nutriments);
  });

  const triggeredAllergens = checkAllergies(product, allergies);

  return {
    product_name: product.product_name || 'Unknown product',
    is_suitable: failedRules.length === 0 && triggeredAllergens.length === 0,
    failed_rules: failedRules,
    triggered_allergens: triggeredAllergens,
  };
}

module.exports = { analyseSuitability, RULES };