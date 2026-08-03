const { analyseSuitability } = require('./suitability');

describe('Suitability Analysis', () => {

  // DIABETES TESTS
  test('flags high sugar product for diabetic user', () => {
    const product = { nutriments: { sugars_100g: 51 }, ingredients_text: '' };
    const result = analyseSuitability(product, ['diabetes']);
    expect(result.is_suitable).toBe(false);
    expect(result.failed_rules).toContain('diabetes');
  });

  test('passes low sugar product for diabetic user', () => {
    const product = { nutriments: { sugars_100g: 3 }, ingredients_text: '' };
    const result = analyseSuitability(product, ['diabetes']);
    expect(result.is_suitable).toBe(true);
  });

  // HYPERTENSION TESTS
  test('flags high sodium product for hypertension user', () => {
    const product = { nutriments: { sodium_100g: 1.2 }, ingredients_text: '' };
    const result = analyseSuitability(product, ['hypertension']);
    expect(result.is_suitable).toBe(false);
    expect(result.failed_rules).toContain('hypertension');
  });

  test('passes low sodium product for hypertension user', () => {
    const product = { nutriments: { sodium_100g: 0.2 }, ingredients_text: '' };
    const result = analyseSuitability(product, ['hypertension']);
    expect(result.is_suitable).toBe(true);
  });

  // ALLERGEN TESTS
  test('flags dairy allergen in ingredients', () => {
    const product = { nutriments: {}, ingredients_text: 'sugar, milk, cocoa butter' };
    const result = analyseSuitability(product, ['dairy']);
    expect(result.is_suitable).toBe(false);
    expect(result.triggered_allergens).toContain('dairy');
  });

  test('flags nut allergen in ingredients', () => {
    const product = { nutriments: {}, ingredients_text: 'sugar, almond, chocolate' };
    const result = analyseSuitability(product, ['nuts']);
    expect(result.is_suitable).toBe(false);
    expect(result.triggered_allergens).toContain('nuts');
  });

  // EDGE CASES
  test('returns suitable when user has no health conditions', () => {
    const product = { nutriments: { sugars_100g: 60 }, ingredients_text: 'milk, sugar' };
    const result = analyseSuitability(product, []);
    expect(result.is_suitable).toBe(true);
  });

  test('handles missing nutriment data without crashing', () => {
    const product = { nutriments: {}, ingredients_text: '' };
    const result = analyseSuitability(product, ['diabetes', 'hypertension']);
    expect(result).toBeDefined();
    expect(result.is_suitable).toBe(true);
  });

  test('flags multiple conditions correctly', () => {
    const product = { nutriments: { sugars_100g: 51, sodium_100g: 1.2 }, ingredients_text: 'milk' };
    const result = analyseSuitability(product, ['diabetes', 'hypertension', 'dairy']);
    expect(result.is_suitable).toBe(false);
    expect(result.failed_rules).toContain('diabetes');
    expect(result.failed_rules).toContain('hypertension');
    expect(result.triggered_allergens).toContain('dairy');
  });

});