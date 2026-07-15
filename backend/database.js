const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
    host: process.env.DB_HOST || 'db',
    user: process.env.DB_USER || 'judge0',
    password: process.env.DB_PASSWORD || 'judge0password',
    database: process.env.DB_NAME || 'judge0',
    port: 5432,
});

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

const initDB = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Create Users table
        await client.query(`
            CREATE TABLE IF NOT EXISTS exam_users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL CHECK(role IN ('admin', 'student'))
            )
        `);

        // Create Tasks table
        await client.query(`
            CREATE TABLE IF NOT EXISTS exam_tasks (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                language_id INTEGER,
                deadline TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create Submissions table
        await client.query(`
            CREATE TABLE IF NOT EXISTS exam_submissions (
                id SERIAL PRIMARY KEY,
                task_id INTEGER REFERENCES exam_tasks(id),
                student_id INTEGER REFERENCES exam_users(id),
                code TEXT NOT NULL,
                language_id INTEGER NOT NULL,
                cheat_score INTEGER DEFAULT 0,
                cheat_events TEXT,
                grade INTEGER,
                output TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Migrate existing table
        await client.query(`ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS output TEXT;`);


        // Insert default admin user if none exists
        const res = await client.query("SELECT * FROM exam_users WHERE username = 'admin'");
        if (res.rows.length === 0) {
            const salt = bcrypt.genSaltSync(10);
            const hash = bcrypt.hashSync('admin123', salt);
            await client.query("INSERT INTO exam_users (username, password, role) VALUES ($1, $2, $3)", ['admin', hash, 'admin']);
            console.log("Created default admin account (admin / admin123)");
        }
        
        await client.query('COMMIT');
        console.log('Connected to PostgreSQL and initialized tables');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Failed to initialize database tables', e);
    } finally {
        client.release();
    }
};

initDB();

module.exports = {
    query: (text, params) => pool.query(text, params)
};
