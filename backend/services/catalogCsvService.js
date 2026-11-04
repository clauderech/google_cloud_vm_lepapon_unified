'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { db } = require('../config/knex');

const CATALOG_CSV_PATH = path.resolve(
  __dirname,
  '../../docs/catalog_products_2026-01-05.csv'
);

function parseCsv(content) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];

    if (inQuotes) {
      if (character === '"' && content[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        inQuotes = false;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"' && field.length === 0) {
      inQuotes = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n' || character === '\r') {
      row.push(field);
      if (row.some(value => value.length > 0)) rows.push(row);
      row = [];
      field = '';
      if (character === '\r' && content[index + 1] === '\n') index += 1;
    } else {
      field += character;
    }
  }

  if (inQuotes) {
    throw new Error('CSV inválido: campo entre aspas não foi fechado.');
  }

  row.push(field);
  if (row.some(value => value.length > 0)) rows.push(row);
  if (rows.length === 0) return [];

  const headers = rows[0].map(header => header.trim());
  if (headers.some(header => !header)) {
    throw new Error('CSV inválido: cabeçalho contém coluna sem nome.');
  }

  return rows.slice(1).map((values, index) => {
    if (values.length !== headers.length) {
      throw new Error(
        `CSV inválido na linha ${index + 2}: esperadas ${headers.length} colunas, recebidas ${values.length}.`
      );
    }

    return Object.fromEntries(headers.map((header, column) => [header, values[column]]));
  });
}

async function readCatalogProducts() {
  const content = await fs.readFile(CATALOG_CSV_PATH, 'utf8');
  return parseCsv(content.replace(/^\uFEFF/, ''));
}

function formatPrice(price) {
  const amount = Number(price);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new TypeError(`Preço inválido para atualizar o catálogo: ${price}`);
  }

  return `R$ ${amount.toFixed(2).replace('.', ',')}`;
}

function serializeCsv(products) {
  if (products.length === 0) return '';

  const headers = Object.keys(products[0]);
  const escapeField = value => {
    const text = String(value ?? '');
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  return [
    headers.map(escapeField).join(','),
    ...products.map(product => headers.map(header => escapeField(product[header])).join(','))
  ].join('\n') + '\n';
}

async function updateCatalogPricesFromProducts() {
  const catalogProducts = await readCatalogProducts();
  const productIds = catalogProducts.map(product => product.id);
  const products = productIds.length > 0
    ? await db('products').select('id', 'price').whereIn('id', productIds)
    : [];
  const productsById = new Map(products.map(product => [String(product.id), product]));
  const unmatchedIds = [];
  let updatedCount = 0;

  const updatedCatalog = catalogProducts.map(catalogProduct => {
    const product = productsById.get(String(catalogProduct.id));
    if (!product) {
      unmatchedIds.push(catalogProduct.id);
      return catalogProduct;
    }

    updatedCount += 1;
    return { ...catalogProduct, price: formatPrice(product.price) };
  });

  if (updatedCount > 0) {
    await fs.writeFile(CATALOG_CSV_PATH, serializeCsv(updatedCatalog), 'utf8');
  }

  return { updatedCount, unmatchedIds };
}

module.exports = { readCatalogProducts, updateCatalogPricesFromProducts };
