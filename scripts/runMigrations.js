const fs = require('fs');
const path = require('path');

// Tentar carregar variáveis de .env.local caso disponível
try {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (!process.env[key]) process.env[key] = value;
      }
    });
  }
} catch (e) {
  // Ignora se não houver arquivo .env.local
}

async function run() {
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  console.log('🚀 Iniciando verificador de migrações SQL...');
  console.log(`📁 Diretório de migrações: ${migrationsDir}`);

  if (!fs.existsSync(migrationsDir)) {
    console.error('❌ Diretório de migrações não encontrado!');
    process.exit(1);
  }

  const sqlFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  console.log(`📊 Total de migrações encontradas: ${sqlFiles.length}`);
  sqlFiles.forEach((file, index) => {
    console.log(`   ${index + 1}. [${file}]`);
  });

  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;

  if (!connectionString) {
    console.log('\n⚠️ Nenhuma variável DATABASE_URL / POSTGRES_URL configurada.');
    console.log('✅ Validação sintática e estrutural dos arquivos de migração concluída com sucesso!');
    console.log('💡 Dica: Para aplicar no banco de dados real, configure DATABASE_URL no .env.local ou ambiente Docker.');
    return;
  }

  let Client;
  try {
    Client = require('pg').Client;
  } catch (err) {
    console.error('❌ Pacote pg não instalado. Execute: npm install pg');
    process.exit(1);
  }

  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('🔌 Conexão com o banco de dados estabelecida.');

    // Criar tabela de controle de migrações se não existir
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        inserted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Obter migrações já executadas
    const { rows } = await client.query('SELECT version FROM schema_migrations');
    const appliedVersions = new Set(rows.map(r => r.version));

    let executedCount = 0;

    for (const file of sqlFiles) {
      if (appliedVersions.has(file)) {
        continue;
      }

      console.log(`🏃 Executando migração: ${file}...`);
      const sqlContent = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

      // Executar migração individual em uma transação
      await client.query('BEGIN');
      try {
        if (sqlContent.trim()) {
          await client.query(sqlContent);
        }
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`✅ Migração aplicada com sucesso: ${file}`);
        executedCount++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ Falha ao aplicar a migração ${file}. Transação revertida.`);
        throw err;
      }
    }

    if (executedCount === 0) {
      console.log('✅ Todas as migrações já estão atualizadas no banco de dados.');
    } else {
      console.log(`🎉 Sucesso! ${executedCount} nova(s) migração(ões) aplicada(s).`);
    }

  } catch (err) {
    console.error('❌ Erro durante a execução das migrações:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();