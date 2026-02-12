-- Create user
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'swarm_user') THEN
        CREATE USER swarm_user WITH PASSWORD 'swarm_pass_dev';
    END IF;
END $$;

-- Create database
SELECT 'CREATE DATABASE insta_swarm OWNER swarm_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'insta_swarm')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE insta_swarm TO swarm_user;

\echo 'Database setup complete! Now run the schema setup.'
