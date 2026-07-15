# Offline Coding Platform with Exam Mode & AI Assistant

A heavily customized, fully offline browser-based programming environment with built-in user management, task assignment, exam anti-cheat mechanisms, and a localized AI coding assistant.

---

## 🚀 Custom Features Added

This project was extensively extended from its base configuration. The following major features have been added:

1. **Fully Offline Execution Sandbox**: 
   - Modified the docker-compose and configuration to bypass system cgroup requirements, enabling seamless isolated offline execution on modern Linux distros (e.g., Fedora) without disabling SELinux globally.
2. **Local AI Assistant (Ollama)**:
   - Stripped out cloud-based AI providers and replaced them with a local API integration connecting to **Ollama** (`localhost:11434`).
   - The UI automatically loads locally downloaded models and performs inference 100% offline.
3. **Admin & Student Role System**:
   - Built a custom Node.js Express backend and SQLite database to support User and Admin accounts.
   - **Admins** can create coding tasks and review student submissions and grades.
   - **Students** have a personalized dashboard to view and start assigned tasks.
4. **Exam Mode & Anti-Cheat Engine**:
   - Starting a task triggers "Exam Mode," forcing the browser into fullscreen.
   - A built-in anti-cheat monitor watches for `visibilitychange` and `blur` events (e.g., minimizing the browser or switching tabs to cheat).
   - Violations are silently logged and compiled into a "Cheat Score" visible to the administrator.
5. **UI Debloating**:
   - Removed third-party cloud integrations (like Puter) and external copyright footers for a cleaner, unified local experience.

---

## 🛠️ Open-Source Components & Copyrights

This project stands on the shoulders of several incredible open-source projects. 

### [Judge0 IDE](https://github.com/judge0/ide)
- **Role**: Base frontend UI for the coding environment.
- **Copyright**: © 2016-2026 Judge0 d.o.o.
- **License**: MIT License

### [Judge0 CE (Execution Engine)](https://github.com/judge0/judge0)
- **Role**: The core isolated sandbox that compiles and executes code safely via Docker.
- **Copyright**: © 2016-2026 Judge0 d.o.o.
- **License**: MIT License

### [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- **Role**: The powerful code editor that powers VS Code.
- **Copyright**: © Microsoft Corporation
- **License**: MIT License

### [Semantic UI](https://semantic-ui.com/)
- **Role**: The frontend CSS framework used for modals, buttons, and layouts.
- **Copyright**: © Semantic UI
- **License**: MIT License

### Backend Stack
- **Node.js, Express, and SQLite**: Used for the custom authentication, task assignment, and grading API.

---

## ⚙️ Getting Started

### Prerequisites
- Docker and Docker Compose
- (Optional) [Ollama](https://ollama.com/) running locally for the AI features.

### Installation

1. **Start the environment:**
   \`\`\`bash
   docker compose up -d --build
   \`\`\`
2. **Access the IDE:**
   Open your browser and navigate to `http://localhost:8544`
3. **Login:**
   - Click **Login** in the top right.
   - Default Admin credentials: `admin` / `admin123`
   - Students can register their own accounts directly from the login modal.

### Running AI Offline
Ensure you have Ollama installed and running with CORS allowed:
\`\`\`bash
OLLAMA_ORIGINS="*" ollama serve
\`\`\`
Then, pull your preferred model (e.g., `ollama pull llama3`). The IDE will detect it automatically!
