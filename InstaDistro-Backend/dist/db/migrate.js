"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const database_1 = require("../config/database");
async function runMigrations() {
    console.log('🔄 Running database migrations...\n');
    try {
        // Read the SQL migration file
        const migrationPath = (0, path_1.join)(__dirname, 'migrations.sql');
        const migrationSQL = (0, fs_1.readFileSync)(migrationPath, 'utf-8');
        console.log('📄 Reading migrations from:', migrationPath);
        // Execute the migration
        await database_1.pool.query(migrationSQL);
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
        const result = await database_1.pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
        console.log(`\n📊 Total tables created: ${result.rows.length}`);
        console.log('\nDatabase is ready for use! 🎉\n');
    }
    catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
    finally {
        await (0, database_1.closePool)();
    }
}
// Run migrations
runMigrations()
    .then(() => process.exit(0))
    .catch((error) => {
    console.error('Migration error:', error);
    process.exit(1);
});
