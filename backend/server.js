const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'supersecretkey123';

// --- Middleware for Authentication ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    next();
};

// --- Routes ---

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const { rows } = await db.query("SELECT * FROM exam_users WHERE username = $1", [username]);
        if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
        
        const user = rows[0];
        if (bcrypt.compareSync(password, user.password)) {
            const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
            res.json({ token, role: user.role, username: user.username });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body;
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    
    try {
        await db.query("INSERT INTO exam_users (username, password, role) VALUES ($1, $2, 'student')", [username, hash]);
        res.status(201).json({ message: 'User created' });
    } catch (err) {
        res.status(400).json({ error: 'Username already exists' });
    }
});

app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { rows } = await db.query("SELECT id, username, role FROM exam_users WHERE role = 'student' ORDER BY id DESC");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/tasks', authenticateToken, requireAdmin, async (req, res) => {
    const { title, description, language_id } = req.body;
    try {
        const { rows } = await db.query(
            "INSERT INTO exam_tasks (title, description, language_id) VALUES ($1, $2, $3) RETURNING id", 
            [title, description, language_id]
        );
        res.status(201).json({ id: rows[0].id, title, description, language_id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/tasks', authenticateToken, async (req, res) => {
    try {
        const { rows } = await db.query("SELECT * FROM exam_tasks ORDER BY created_at DESC");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/submissions', authenticateToken, async (req, res) => {
    if (req.user.role !== 'student') return res.status(403).json({ error: 'Only students can submit' });
    
    const { task_id, code, language_id, cheat_score, cheat_events } = req.body;
    try {
        const { rows } = await db.query(
            `INSERT INTO exam_submissions (task_id, student_id, code, language_id, cheat_score, cheat_events) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`, 
            [task_id, req.user.id, code, language_id, cheat_score, JSON.stringify(cheat_events)]
        );
        res.status(201).json({ id: rows[0].id, message: 'Submitted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/submissions', authenticateToken, requireAdmin, async (req, res) => {
    const query = `
        SELECT s.*, u.username, t.title as task_title 
        FROM exam_submissions s 
        JOIN exam_users u ON s.student_id = u.id 
        JOIN exam_tasks t ON s.task_id = t.id 
        ORDER BY s.created_at DESC
    `;
    try {
        const { rows } = await db.query(query);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/submissions/:id/grade', authenticateToken, requireAdmin, async (req, res) => {
    const { grade } = req.body;
    try {
        await db.query("UPDATE exam_submissions SET grade = $1 WHERE id = $2", [grade, req.params.id]);
        res.json({ message: 'Grade updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
