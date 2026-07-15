# Secure Programming Exam System

This project is an advanced, highly secure web-based Programming Examination System. It allows instructors to assign coding tasks, enforce strict anti-cheating protocols during the exam, and seamlessly review and grade student submissions.

## Features Added to the Original System

The following core features were built and integrated directly into the system:

*   **Role-Based Authentication:** Complete User/Admin account system with JWT-based secure login.
*   **Centralized Admin Dashboard:**
    *   Create customized coding tasks for students.
    *   Set precise exam deadlines.
    *   Review all student submissions in a single table.
    *   Grade submissions seamlessly.
    *   Review detailed cheat logs for flagged students.
*   **Student Dashboard:**
    *   View assigned tasks and deadlines.
    *   Instantly see grades on past submissions.
    *   Start exams in a locked, controlled environment.
    *   Automatic lockdown of expired or already-submitted exams.
*   **Strict Anti-Cheat System:**
    *   Forces the exam to run in Fullscreen mode.
    *   Tracks tab-switching and window-blurring events.
    *   Instantly locks the exam upon a violation with a massive 5-second penalty countdown timer.
    *   Force-submits the student's code automatically to the server with a "Cheat Flag" if they violate the rules.
*   **Robust PostgreSQL Backend:** Replaced the default temporary SQLite database with a production-ready PostgreSQL integration.

## Open Source Projects & Copyrights

This project builds upon several incredible open-source tools:

*   **[Judge0 IDE](https://github.com/judge0/ide):** The core code editor UI. (MIT License - Copyright (c) 2016-present Herman Zvonimir Došilović)
*   **[Judge0 CE](https://github.com/judge0/judge0):** The backend code execution engine that securely compiles and runs the student's code. (MIT License)
*   **[Monaco Editor](https://microsoft.github.io/monaco-editor/):** The code editor component powering the text area, built by Microsoft. (MIT License)
*   **[Semantic UI](https://semantic-ui.com/):** The frontend CSS framework used to build the dashboards and overlays. (MIT License)
*   **[Express.js](https://expressjs.com/):** The Node.js web framework powering our custom Authentication and Task Management API. (MIT License)
*   **[PostgreSQL](https://www.postgresql.org/):** The advanced open-source relational database used to store users, tasks, and submissions. (PostgreSQL License)

## Quick Start

1. Ensure you have Docker and Docker Compose installed.
2. Clone this repository.
3. Run the following command to start all microservices:
   ```bash
   docker compose up -d --build
   ```
4. Access the IDE at `http://localhost:8544`.
5. Log in as an administrator using the default credentials (`admin` / `admin123`) to access the dashboard and start creating exams!
