

/**
 * NO-OP
 *
 * O projeto chegou a considerar persistir o payload de pedidos (type: "order")
 * na tabela `whatsapp_messages`, porém neste momento não queremos modificar o DB.
 */

export async function up(_knex) {
  // intencionalmente vazio
}

export async function down(_knex) {
  // intencionalmente vazio
}
