const SELLABLE_TYPES = new Set(['prato', 'drink', 'revenda', 'sorvete', 'destilado']);
const INGREDIENT_TYPES = new Set(['insumo', 'insumo_bebida', 'destilado']);

function roleValue(product, role) {
  const snakeRole = role.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  return product?.[role] ?? product?.[snakeRole];
}

function isSellable(product) {
  const value = roleValue(product, 'isSellable');
  if (value !== null && value !== undefined) return Boolean(value);
  return SELLABLE_TYPES.has(product?.type);
}

function isIngredient(product) {
  const value = roleValue(product, 'isIngredient');
  if (value !== null && value !== undefined) return Boolean(value);
  return INGREDIENT_TYPES.has(product?.type);
}

function isProduced(product) {
  return isIngredient(product) && Array.isArray(product?.recipe) && product.recipe.length > 0;
}

module.exports = {
  INGREDIENT_TYPES,
  SELLABLE_TYPES,
  isIngredient,
  isProduced,
  isSellable
};