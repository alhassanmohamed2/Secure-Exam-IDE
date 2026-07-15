const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'supersecretkey123'; // In production, this should be an environment variable

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

// Login
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (err || !user) return res.status(401).json({ error: 'Invalid credentials' });
        
        if (bcrypt.compareSync(password, user.password)) {
            const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
            res.json({ token, role: user.role, username: user.username });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    });
});

// Register (Student)
app.post('/api/auth/register', (req, res) => {
    const { username, password } = req.body;
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    
    db.run("INSERT INTO users (username, password, role) VALUES (?, ?, 'student')", [username, hash], function(err) {
        if (err) return res.status(400).json({ error: 'Username already exists' });
        res.status(201).json({ message: 'User created' });
    });
});

// Create Task (Admin only)
app.post('/api/tasks', authenticateToken, requireAdmin, (req, res) => {
    const { title, description, language_id } = req.body;
    db.run("INSERT INTO tasks (title, description, language_id) VALUES (?, ?, ?)", 
        [title, description, language_id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, title, description, language_id });
    });
});

// Get Tasks
app.get('/api/tasks', authenticateToken, (req, res) => {
    db.all("SELECT * FROM tasks ORDER BY created_at DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Submit Task (Student only)
app.post('/api/submissions', authenticateToken, (req, res) => {
    if (req.user.role !== 'student') return res.status(403).json({ error: 'Only students can submit' });
    
    const { task_id, code, language_id, cheat_score, cheat_events } = req.body;
    
    db.run(`INSERT INTO submissions (task_id, student_id, code, language_id, cheat_score, cheat_events) 
            VALUES (?, ?, ?, ?, ?, ?)`, 
        [task_id, req.user.id, code, language_id, cheat_score, JSON.stringify(cheat_events)], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, message: 'Submitted successfully' });
    });
});

// Get Submissions (Admin only)
app.get('/api/submissions', authenticateToken, requireAdmin, (req, res) => {
    const query = `
        SELECT s.*, u.username, t.title as task_title 
        FROM submissions s 
        JOIN users u ON s.student_id = u.id 
        JOIN tasks t ON s.task_id = t.id 
        ORDER BY s.created_at DESC
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Grade Submission (Admin only)
app.put('/api/submissions/:id/grade', authenticateToken, requireAdmin, (req, res) => {
    const { grade } = req.body;
    db.run("UPDATE submissions SET grade = ? WHERE id = ?", [grade, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Grade updated' });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
