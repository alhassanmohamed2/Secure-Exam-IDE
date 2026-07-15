// Exam Mode and Admin Logic
import { sourceEditor, stdoutEditor } from './ide.js';

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
    examState.isActive = false; // Immediately lock exam from further events
    examState.cheatScore += 1;
    examState.cheatEvents.push({ time: new Date().toISOString(), reason });
    
    const overlayHtml = `
        <div id="cheat-overlay" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(200, 20, 20, 0.95); z-index: 99999; display: flex; flex-direction: column; justify-content: center; align-items: center; color: white; text-align: center;">
            <h1 style="font-size: 4rem; margin-bottom: 20px;">🚨 CHEATING DETECTED 🚨</h1>
            <h2 style="font-size: 2rem; margin-bottom: 30px;">Violation: ${reason}</h2>
            <h3 style="font-size: 1.5rem;">Your exam is locked and will be forcefully submitted in <span id="cheat-timer" style="font-size: 3rem; font-weight: bold; margin: 0 10px;">5</span> seconds.</h3>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', overlayHtml);
    
    let time = 5;
    const timerInterval = setInterval(() => {
        time--;
        const timerSpan = document.getElementById('cheat-timer');
        if (timerSpan) timerSpan.innerText = time;
        if (time <= 0) {
            clearInterval(timerInterval);
            submitExam(true);
        }
    }, 1000);
}

function updateAuthUI() {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const username = localStorage.getItem('username');

    if (token) {
        document.getElementById('auth-login-btn').style.display = 'none';
        document.getElementById('auth-logout-btn').style.display = 'block';
        document.getElementById('auth-change-password-btn').style.display = 'block';
        document.getElementById('auth-logout-btn').setAttribute('data-content', `Logout (${username})`);
        document.getElementById('exam-dashboard-btn').style.display = 'block';
    } else {
        document.getElementById('auth-login-btn').style.display = 'block';
        document.getElementById('auth-logout-btn').style.display = 'none';
        document.getElementById('auth-change-password-btn').style.display = 'none';
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
    
    window.submissionsMap = {};
    submissions.forEach(s => window.submissionsMap[s.id] = s);

    // Fetch Tasks
    const taskRes = await fetch(`${API_BASE}/tasks`, { headers: { 'Authorization': `Bearer ${token}` } });
    const tasks = await taskRes.json();

    // Fetch Students
    const usersRes = await fetch(`${API_BASE}/users`, { headers: { 'Authorization': `Bearer ${token}` } });
    const users = await usersRes.json();

    let html = `
        <div class="ui top attached tabular menu">
            <a class="item active" data-tab="submissions">Submissions</a>
            <a class="item" data-tab="tasks">Tasks</a>
            <a class="item" data-tab="students">Students</a>
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
                                <button class="ui mini blue button" onclick="viewSubmissionCode(${s.id})">View Code</button>
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
                <div class="two fields">
                    <div class="field">
                        <label>Title</label>
                        <input type="text" id="task-title" required>
                    </div>
                    <div class="field">
                        <label>Deadline (Optional)</label>
                        <input type="datetime-local" id="task-deadline">
                    </div>
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

        <div class="ui bottom attached tab segment" data-tab="students">
            <form class="ui form" id="create-student-form">
                <h4 class="ui dividing header">Create New Student</h4>
                <div class="two fields">
                    <div class="field">
                        <label>Username</label>
                        <input type="text" id="new-student-username" required>
                    </div>
                    <div class="field">
                        <label>Password</label>
                        <input type="password" id="new-student-password" required>
                    </div>
                </div>
                <button class="ui primary button" type="button" onclick="createStudent()">Create Student Account</button>
            </form>
            <div class="ui divider"></div>
            <table class="ui celled table">
                <thead><tr><th>Student ID</th><th>Username</th><th>Actions</th></tr></thead>
                <tbody>
                    ${(users.length ? users : []).map(u => `<tr>
                        <td>${u.id}</td>
                        <td>${u.username}</td>
                        <td><button class="ui mini red button" onclick="resetStudentPassword(${u.id})">Reset Password</button></td>
                    </tr>`).join('')}
                </tbody>
            </table>
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
            ${tasks.map(t => {
                const isSubmitted = !!t.submission_id;
                const isGraded = t.grade !== null && t.grade !== undefined;
                const pastDeadline = t.deadline && new Date() > new Date(t.deadline);
                const disabled = isSubmitted || pastDeadline;
                
                let btnText = "Start Exam";
                if (isSubmitted) btnText = isGraded ? `Graded: ${t.grade}/100` : "Submitted";
                else if (pastDeadline) btnText = "Deadline Passed";
                
                return `
                <div class="item">
                    <div class="right floated content">
                        <button class="ui ${disabled ? 'disabled' : 'primary'} button" ${disabled ? 'disabled' : ''} onclick="${disabled ? '' : `startExam(${t.id}, '${t.title.replace(/'/g, "\\'")}')`}">${btnText}</button>
                    </div>
                    <div class="content">
                        <div class="header">${t.title}</div>
                        <div class="description">
                            ${t.description}
                            ${t.deadline ? `<br><small style="color:red;">Deadline: ${new Date(t.deadline).toLocaleString()}</small>` : ''}
                        </div>
                    </div>
                </div>
                `;
            }).join('')}
        </div>
    `;

    document.getElementById('dashboard-content').innerHTML = html;
}

// Admin Actions
window.createStudent = async function() {
    const username = document.getElementById('new-student-username').value;
    const password = document.getElementById('new-student-password').value;
    if (!username || !password) return alert("Please enter both username and password");
    
    try {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        if (!res.ok) throw new Error((await res.json()).error);
        alert("Student account created successfully!");
        openDashboard(); // refresh dashboard
    } catch (err) {
        alert("Error creating student: " + err.message);
    }
}

window.changeMyPassword = async function() {
    const newPassword = prompt('Enter your new password:');
    if (!newPassword) return;

    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_BASE}/users/me/password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ new_password: newPassword })
        });
        if (!res.ok) throw new Error((await res.json()).error);
        alert('Password changed successfully!');
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

window.resetStudentPassword = async function(id) {
    const newPassword = prompt('Enter new password for this student:');
    if (!newPassword) return;

    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_BASE}/users/${id}/password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ new_password: newPassword })
        });
        if (!res.ok) throw new Error((await res.json()).error);
        alert('Student password reset successfully!');
    } catch (err) {
        alert('Error: ' + err.message);
    }
}
window.createTask = async function() {
    const title = document.getElementById('task-title').value;
    const description = document.getElementById('task-desc').value;
    let deadline = document.getElementById('task-deadline').value;
    if (deadline) deadline = new Date(deadline).toISOString();

    const token = localStorage.getItem('token');

    await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title, description, language_id: 0, deadline })
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

window.viewSubmissionCode = function(id) {
    const s = window.submissionsMap[id];
    if (!s) return;
    
    const codeEscaped = s.code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const outputEscaped = s.output ? s.output.replace(/</g, '&lt;').replace(/>/g, '&gt;') : 'No output recorded.';
    
    const modalHtml = `
        <div class="ui modal" id="code-viewer-modal">
            <i class="close icon"></i>
            <div class="header">
                Submission Viewer
                <div class="sub header">Task: ${s.task_title} | Student: ${s.username}</div>
            </div>
            <div class="content" style="background: #1e1e1e; display: flex; flex-direction: column; gap: 15px; max-height: 70vh; overflow-y: auto;">
                <div>
                    <h4 style="color: #fff; margin-bottom: 5px;">Source Code:</h4>
                    <pre style="margin: 0; color: #d4d4d4; font-family: monospace; font-size: 14px; white-space: pre-wrap; background: #2d2d2d; padding: 10px; border-radius: 4px;"><code>${codeEscaped}</code></pre>
                </div>
                <div>
                    <h4 style="color: #fff; margin-bottom: 5px;">Execution Output:</h4>
                    <pre style="margin: 0; color: #a5d6a7; font-family: monospace; font-size: 14px; white-space: pre-wrap; background: #000; padding: 10px; border-radius: 4px;"><code>${outputEscaped}</code></pre>
                </div>
            </div>
            <div class="actions">
                <div class="ui blue button" onclick="loadCodeIntoIDE(${s.id})"><i class="play icon"></i> Load into IDE</div>
                <div class="ui primary approve button">Close</div>
            </div>
        </div>
    `;
    
    const existing = document.getElementById('code-viewer-modal');
    if (existing) existing.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // We must enable multiple modals because we are opening this *on top* of the Dashboard Modal!
    $('#code-viewer-modal').modal({
        allowMultiple: true,
        onHidden: function() { $(this).remove(); }
    }).modal('show');
}

window.loadCodeIntoIDE = function(id) {
    const s = window.submissionsMap[id];
    if (s && sourceEditor) {
        sourceEditor.setValue(s.code);
        const sel = document.getElementById('select-language');
        if (sel) {
            sel.value = s.language_id;
            $(sel).dropdown('set selected', String(s.language_id));
        }
        $('#dashboard-modal').modal('hide');
        $('#code-viewer-modal').modal('hide');
    }
}
    


// Student Exam Action
window.startExam = function(taskId, taskTitle) {
    $('#dashboard-modal').modal('hide');
    alert(`Starting Exam: ${taskTitle}. You will be placed in fullscreen mode. Switching tabs or exiting fullscreen will be recorded as CHEATING.`);
    
    examState.taskId = taskId;
    examState.cheatScore = 0;
    examState.cheatEvents = [];

    // Enter Fullscreen
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error("Error attempting to enable fullscreen:", err);
        });
    }

    // Give browser time to finish the fullscreen transition before activating anti-cheat
    setTimeout(() => {
        examState.isActive = true;
    }, 2000);

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

window.submitExam = async function(isForced = false) {
    if (!isForced) {
        // Temporarily disable anti-cheat because the confirm() dialog steals window focus!
        examState.isActive = false; 
        const wantsSubmit = confirm('Are you sure you want to submit your exam?');
        if (!wantsSubmit) {
            // Give the browser time to regain focus before turning anti-cheat back on
            setTimeout(() => { examState.isActive = true; }, 1000);
            return;
        }
    }

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

    let languageId = 71; // Default Python
    const sel = document.getElementById('select-language');
    if (sel && sel.value) languageId = parseInt(sel.value);

    let output = '';
    if (stdoutEditor) output = stdoutEditor.getValue();

    try {
        await fetch(`${API_BASE}/submissions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                task_id: examState.taskId,
                code: code,
                language_id: languageId,
                cheat_score: examState.cheatScore,
                cheat_events: examState.cheatEvents,
                output: output
            })
        });

        if (isForced) {
            alert('Your exam was forcefully submitted to the administrator due to an anti-cheat violation.');
            const overlay = document.getElementById('cheat-overlay');
            if (overlay) overlay.remove();
        } else {
            alert('Exam submitted successfully!');
        }
        
        // Reset Exam Mode
        examState.isActive = false;
        examState.taskId = null;
        if (document.fullscreenElement) document.exitFullscreen().catch(e => console.log(e));
        
        const submitBtn = document.getElementById('exam-submit-btn');
        if (submitBtn) submitBtn.remove();

    } catch (err) {
        alert('Error submitting exam: ' + err.message);
    }
}
