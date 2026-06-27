// alternatives.js
const { analyseSuitability } = require('./suitability');

async function fetchSameCategoryProducts(categoryTag, excludeCode, limit = 20) {
  const url = `https://world.openfoodfacts.org/api/v2/search?categories_tags=${encodeURIComponent(categoryTag)}&fields=code,product_name,nutriments,allergens_tags,traces_tags,ingredients_text,categories_tags&page_size=${limit}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'NutriScan-Test/1.0 (test@example.com)',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    console.error(`Open Food Facts returned ${response.status} for category search`);
    return [];
  }

  const data = await response.json();
  return (data.products || []).filter(p => p.code !== excludeCode);
}

async function suggestAlternatives(product, preferences, limit = 3) {
  const categories = product.categories_tags || [];
  if (categories.length === 0) return [];

  const categoryTag = categories[categories.length - 1];
  const candidates = await fetchSameCategoryProducts(categoryTag, product.code, 20);

  const suitable = [];
  for (const candidate of candidates) {
    const result = analyseSuitability(candidate, preferences);
    if (result.is_suitable) {
      suitable.push({ code: candidate.code, name: result.product_name });
      if (suitable.length >= limit) break;
    }
  }

  return suitable;
}

module.exports = { suggestAlternatives };