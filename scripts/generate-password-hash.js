/**
 * Gera hash bcrypt para uma senha e exibe o SQL de INSERT/UPDATE
 * Uso: node scripts/generate-password-hash.js <username> <senha> [role]
 */

const bcrypt = require('bcryptjs');

const [,, username, password, role = 'admin'] = process.argv;

if (!username || !password) {
  console.log('Uso: node scripts/generate-password-hash.js <username> <senha> [role]');
  console.log('Exemplo: node scripts/generate-password-hash.js admin MinhaS3nha admin');
  process.exit(1);
}

(async () => {
  const hash = await bcrypt.hash(password, 12);

  console.log('\n=== HASH GERADO ===');
  console.log('Username :', username);
  console.log('Role     :', role);
  console.log('Hash     :', hash);

  console.log('\n=== SQL - INSERT (novo usuário) ===');
  console.log(`INSERT INTO users (username, password_hash, role, is_active, created_at)
VALUES ('${username}', '${hash}', '${role}', 1, NOW());`);

  console.log('\n=== SQL - UPDATE (usuário existente) ===');
  console.log(`UPDATE users SET password_hash = '${hash}', updated_at = NOW()
WHERE username = '${username}';`);

  console.log('\n=== VERIFICAÇÃO ===');
  const valid = await bcrypt.compare(password, hash);
  console.log('Hash válido:', valid ? 'SIM ✓' : 'NÃO ✗');
})();
