'use strict';

/**
 * NO-OP
 *
 * O projeto chegou a considerar persistir o payload de pedidos (type: "order")
 * na tabela `whatsapp_messages`, porém neste momento não queremos modificar o DB.
 */

exports.up = async function up(_knex) {
  // intencionalmente vazio
};

exports.down = async function down(_knex) {
  // intencionalmente vazio
};
