import { readFileSync } from 'fs';
import { join } from 'path';
import { pool, closePool } from '../config/database';

async function runMigrations() {
  console.log('🔄 Running database migrations...\n');

  try {
    // Read the SQL migration file
    const migrationPath = join(__dirname, 'migrations.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Reading migrations from:', migrationPath);

    // Execute the migration
    await pool.query(migrationSQL);

    console.log('✅ Migrations completed successfully!\n');
    console.log('Created tables:');
    console.log('  - accounts');
    console.log('  - proxy_configs');
    console.log('  - account_groups');
    console.log('  - warmup_tasks');
    console.log('  - scheduled_posts');
    console.log('  - content_variations');
    console.log('  - account_health_scores');
    console.log('  - queues');
    console.log('  - post_results');

    // Verify tables were created
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log(`\n📊 Total tables created: ${result.rows.length}`);
    console.log('\nDatabase is ready for use! 🎉\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await closePool();
  }
}

// Run migrations
runMigrations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration error:', error);
    process.exit(1);
  });
