-- Ver quais migrações foram executadas
SELECT * FROM knex_migrations ORDER BY batch DESC, id DESC;
