// Exam Mode and Admin Logic
import { sourceEditor } from './ide.js';

const API_BASE = 'http://localhost:3000/api';
let examState = {
    isActive: false,
    taskId: null,
    cheatScore: 0,
    cheatEvents: []
};

// --- Initialization ---
document.addEventListener("DOMContentLoaded", () => {
    updateAuthUI();

    // Login modal logic
    document.getElementById('auth-login-btn').addEventListener('click', () => {
        $('#login-modal').modal('show');
    });

    // Logout logic
    document.getElementById('auth-logout-btn').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('username');
        updateAuthUI();
    });

    // Dashboard modal logic
    document.getElementById('exam-dashboard-btn').addEventListener('click', () => {
        openDashboard();
    });

    // Login form submission
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = e.target.username.value;
        const password = e.target.password.value;

        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            
            if (res.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('role', data.role);
                localStorage.setItem('username', data.username);
                $('#login-modal').modal('hide');
                updateAuthUI();
                e.target.reset();
            } else {
                const errDiv = document.getElementById('login-error');
                errDiv.innerText = data.error;
                errDiv.style.display = 'block';
            }
        } catch (err) {
            console.error('Login failed', err);
        }
    });

    // Register button logic
    document.getElementById('auth-register-btn').addEventListener('click', async () => {
        const form = document.getElementById('login-form');
        const username = form.username.value;
        const password = form.password.value;
        
        if (!username || !password) {
            const errDiv = document.getElementById('login-error');
            errDiv.innerText = "Please enter both username and password to register.";
            errDiv.style.display = 'block';
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            if (res.ok) {
                // Auto-login after registration
                form.dispatchEvent(new Event('submit'));
            } else {
                const data = await res.json();
                const errDiv = document.getElementById('login-error');
                errDiv.innerText = data.error || 'Registration failed';
                errDiv.style.display = 'block';
            }
        } catch (err) {
            console.error('Registration failed', err);
        }
    });

    // Exam Anti-Cheat Listeners
    document.addEventListener("visibilitychange", () => {
        if (examState.isActive && document.visibilityState === 'hidden') {
            recordCheatEvent('Tab switched or minimized');
        }
    });

    window.addEventListener("blur", () => {
        if (examState.isActive) {
            recordCheatEvent('Window lost focus');
        }
    });

    document.addEventListener("fullscreenchange", () => {
        if (examState.isActive && !document.fullscreenElement) {
            recordCheatEvent('Exited fullscreen mode');
        }
    });
});

function recordCheatEvent(reason) {
    examState.cheatScore += 1;
    examState.cheatEvents.push({ time: new Date().toISOString(), reason });
    alert(`WARNING: ${reason}! This has been recorded as a cheat violation. Score: ${examState.cheatScore}`);
}

function updateAuthUI() {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const username = localStorage.getItem('username');

    if (token) {
        document.getElementById('auth-login-btn').style.display = 'none';
        document.getElementById('auth-logout-btn').style.display = 'block';
        document.getElementById('auth-logout-btn').setAttribute('data-content', `Logout (${username})`);
        document.getElementById('exam-dashboard-btn').style.display = 'block';
    } else {
        document.getElementById('auth-login-btn').style.display = 'block';
        document.getElementById('auth-logout-btn').style.display = 'none';
        document.getElementById('exam-dashboard-btn').style.display = 'none';
    }
}

// --- Dashboard Logic ---
async function openDashboard() {
    const role = localStorage.getItem('role');
    const token = localStorage.getItem('token');
    
    document.getElementById('dashboard-content').innerHTML = '<div class="ui active centered inline loader"></div>';
    $('#dashboard-modal').modal('show');

    try {
        if (role === 'admin') {
            await renderAdminDashboard(token);
        } else if (role === 'student') {
            await renderStudentDashboard(token);
        }
    } catch (err) {
        document.getElementById('dashboard-content').innerHTML = `<div class="ui error message">${err.message}</div>`;
    }
}

async function renderAdminDashboard(token) {
    document.getElementById('dashboard-header').innerText = 'Admin Dashboard';
    
    // Fetch Submissions
    const subRes = await fetch(`${API_BASE}/submissions`, { headers: { 'Authorization': `Bearer ${token}` } });
    const submissions = await subRes.json();

    // Fetch Tasks
    const taskRes = await fetch(`${API_BASE}/tasks`, { headers: { 'Authorization': `Bearer ${token}` } });
    const tasks = await taskRes.json();

    let html = `
        <div class="ui top attached tabular menu">
            <a class="item active" data-tab="submissions">Submissions</a>
            <a class="item" data-tab="tasks">Tasks</a>
        </div>
        
        <div class="ui bottom attached tab segment active" data-tab="submissions">
            <table class="ui celled table">
                <thead><tr><th>Task</th><th>Student</th><th>Score</th><th>Cheat Score</th><th>Actions</th></tr></thead>
                <tbody>
                    ${submissions.map(s => `
                        <tr>
                            <td>${s.task_title}</td>
                            <td>${s.username}</td>
                            <td>${s.grade !== null ? s.grade : '<i>Ungraded</i>'}</td>
                            <td class="${s.cheat_score > 0 ? 'error' : 'positive'}">${s.cheat_score}</td>
                            <td>
                                <button class="ui mini basic button" onclick="gradeSubmission(${s.id})">Grade</button>
                                ${s.cheat_score > 0 ? `<button class="ui mini red button" onclick='alert(${JSON.stringify(s.cheat_events)})'>View Cheat Logs</button>` : ''}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="ui bottom attached tab segment" data-tab="tasks">
            <form class="ui form" id="create-task-form">
                <h4 class="ui dividing header">Create New Task</h4>
                <div class="field">
                    <label>Title</label>
                    <input type="text" id="task-title" required>
                </div>
                <div class="field">
                    <label>Description</label>
                    <textarea id="task-desc" rows="2" required></textarea>
                </div>
                <button class="ui primary button" type="button" onclick="createTask()">Create Task</button>
            </form>
            <div class="ui divider"></div>
            <div class="ui list">
                ${tasks.map(t => `<div class="item"><div class="content"><div class="header">${t.title}</div><div class="description">${t.description}</div></div></div>`).join('')}
            </div>
        </div>
    `;

    document.getElementById('dashboard-content').innerHTML = html;
    $('.menu .item').tab(); // Initialize semantic tabs
}

async function renderStudentDashboard(token) {
    document.getElementById('dashboard-header').innerText = 'Student Tasks';
    
    const taskRes = await fetch(`${API_BASE}/tasks`, { headers: { 'Authorization': `Bearer ${token}` } });
    const tasks = await taskRes.json();

    let html = `
        <div class="ui relaxed divided list">
            ${tasks.map(t => `
                <div class="item">
                    <div class="right floated content">
                        <button class="ui primary button" onclick="startExam(${t.id}, '${t.title.replace(/'/g, "\\'")}')">Start Exam</button>
                    </div>
                    <div class="content">
                        <div class="header">${t.title}</div>
                        <div class="description">${t.description}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    document.getElementById('dashboard-content').innerHTML = html;
}

// Admin Actions
window.createTask = async function() {
    const title = document.getElementById('task-title').value;
    const description = document.getElementById('task-desc').value;
    const token = localStorage.getItem('token');

    await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title, description, language_id: 0 })
    });
    
    openDashboard(); // reload
}

window.gradeSubmission = async function(id) {
    const grade = prompt('Enter grade (0-100):');
    if (grade === null || isNaN(grade)) return;

    const token = localStorage.getItem('token');
    await fetch(`${API_BASE}/submissions/${id}/grade`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ grade: parseInt(grade) })
    });
    
    openDashboard(); // reload
}

// Student Exam Action
window.startExam = function(taskId, taskTitle) {
    $('#dashboard-modal').modal('hide');
    alert(`Starting Exam: ${taskTitle}. You will be placed in fullscreen mode. Switching tabs or exiting fullscreen will be recorded as CHEATING.`);
    
    examState.isActive = true;
    examState.taskId = taskId;
    examState.cheatScore = 0;
    examState.cheatEvents = [];

    // Enter Fullscreen
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error("Error attempting to enable fullscreen:", err);
        });
    }

    // Inject submit button if not present
    if (!document.getElementById('exam-submit-btn')) {
        const btnHtml = `
            <div class="item" id="exam-submit-btn">
                <button class="ui red labeled icon button" onclick="submitExam()">
                    <i class="check icon"></i>
                    Finish & Submit Exam
                </button>
            </div>
        `;
        document.querySelector('.right.menu').insertAdjacentHTML('afterbegin', btnHtml);
    }
}

window.submitExam = async function() {
    if (!confirm('Are you sure you want to submit your exam?')) return;

    const token = localStorage.getItem('token');
    // Read the code from Monaco editor in ide.js
    let code = '';
    if (sourceEditor) {
        code = sourceEditor.getValue();
    } else {
        // Fallback for getting code if window.sourceEditor isn't exposed
        // Actually, we can just use the DOM since monaco stores it in lines
        alert('Could not read code. Ensure editor is active.');
        return;
    }

    let languageId = 71; // Default Python, should read from select-language but fine for now
    const sel = document.getElementById('select-language');
    if (sel && sel.value) languageId = parseInt(sel.value);

    try {
        await fetch(`${API_BASE}/submissions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                task_id: examState.taskId,
                code: code,
                language_id: languageId,
                cheat_score: examState.cheatScore,
                cheat_events: examState.cheatEvents
            })
        });

        alert('Exam submitted successfully!');
        
        // Reset Exam Mode
        examState.isActive = false;
        examState.taskId = null;
        if (document.fullscreenElement) document.exitFullscreen();
        document.getElementById('exam-submit-btn').remove();

    } catch (err) {
        alert('Error submitting exam: ' + err.message);
    }
}
