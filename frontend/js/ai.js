"use strict";
import theme from "./theme.js";
import configuration from "./configuration.js";
import { sourceEditor } from "./ide.js";

const THREAD = [
    {
        role: "system",
        content: `
You are an AI assistant integrated into an online code editor.
Your main job is to help users with their code, but you should also be able to engage in casual conversation.

The following are your guidelines:
1. **If the user asks for coding help**:
   - Always consider the user's provided code.
   - Analyze the code and provide relevant help (debugging, optimization, explanation, etc.).
   - Make sure to be specific and clear when explaining things about their code.

2. **If the user asks a casual question or makes a casual statement**:
   - Engage in friendly, natural conversation.
   - Do not reference the user's code unless they bring it up or ask for help.
   - Be conversational and polite.

3. **If the user's message is ambiguous or unclear**:
   - Politely ask for clarification or more details to better understand the user's needs.
   - If the user seems confused about something, help guide them toward what they need.

4. **General Behavior**:
   - Always respond in a helpful, friendly, and professional tone.
   - Never assume the user's intent. If unsure, ask clarifying questions.
   - Keep the conversation flowing naturally, even if the user hasn't directly asked about their code.

You will always have access to the user's latest code.
Use this context only when relevant to the user's message.
If their message is unrelated to the code, focus solely on their conversational intent.
        `.trim()
    }
];

async function getAIResponse(thread, model) {
    const cleanModelName = model.replace(" (Ollama)", "");

    try {
        const response = await fetch("http://localhost:11434/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: cleanModelName,
                messages: thread.map(msg => ({ role: msg.role, content: msg.content })),
                stream: false
            })
        });
        if (response.ok) {
            const data = await response.json();
            return data.message.content;
        } else {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `Ollama returned status ${response.status}`);
        }
    } catch (e) {
        console.error("Local Ollama chat failed:", e);
        if (typeof puter !== "undefined" && puter.ai && puter.env !== "web") {
            try {
                const aiResponse = await puter.ai.chat(thread, { model: model });
                let aiResponseValue = aiResponse.toString();
                if (typeof aiResponseValue !== "string") {
                    aiResponseValue = aiResponseValue.map(v => v.text).join("\n");
                }
                return aiResponseValue;
            } catch (err) {
                throw e;
            }
        } else {
            throw e;
        }
    }
}

async function loadOllamaModels() {
    const select = document.getElementById("judge0-chat-model-select");
    if (!select) return;

    try {
        const response = await fetch("http://localhost:11434/api/tags");
        if (response.ok) {
            const data = await response.json();
            if (data.models && data.models.length > 0) {
                select.innerHTML = "";
                data.models.forEach(model => {
                    const option = document.createElement("option");
                    option.text = model.name;
                    option.value = model.name;
                    select.appendChild(option);
                });
                select.dispatchEvent(new Event('change'));
                if (window.$ && typeof window.$.fn.dropdown === "function") {
                    $(select).dropdown();
                    $(select).dropdown('refresh');
                    $(select).dropdown('set selected', select.value);
                }
                console.log("Loaded local Ollama models:", data.models.map(m => m.name));
                return;
            }
        }
    } catch (e) {
        console.log("Local Ollama not running or CORS not configured. Adding default fallback options.");
    }

    const defaultOllamaModels = ["llama3.1", "qwen2.5-coder", "deepseek-coder", "codellama", "llama3"];
    
    const divider = document.createElement("option");
    divider.text = "--- Local Ollama ---";
    divider.disabled = true;
    select.prepend(divider);

    defaultOllamaModels.forEach(model => {
        const option = document.createElement("option");
        option.text = `${model} (Ollama)`;
        option.value = model;
        select.prepend(option);
    });

    select.selectedIndex = 0;
    select.dispatchEvent(new Event('change'));
    if (window.$ && typeof window.$.fn.dropdown === "function") {
        $(select).dropdown();
        $(select).dropdown('refresh');
        $(select).dropdown('set selected', select.value);
    }
}

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("judge0-chat-form").addEventListener("submit", async function (event) {
        event.preventDefault();

        const userInput = document.getElementById("judge0-chat-user-input");
        const userInputValue = userInput.value.trim();
        if (userInputValue === "") {
            return;
        }

        const sendButton = document.getElementById("judge0-chat-send-button");

        sendButton.classList.add("loading");
        userInput.disabled = true;

        const userMessage = document.createElement("div");
        userMessage.innerText = userInputValue;
        userMessage.classList.add("ui", "message", "judge0-message", "judge0-user-message");
        if (!theme.isLight()) {
            userMessage.classList.add("inverted");
        }

        const messages = document.getElementById("judge0-chat-messages");
        messages.appendChild(userMessage);

        userInput.value = "";
        messages.scrollTop = messages.scrollHeight;

        THREAD.push({
            role: "user",
            content: `
User's code:
${sourceEditor.getValue()}

User's message:
${userInputValue}
`.trim()
        });

        const aiMessage = document.createElement("div");
        aiMessage.classList.add("ui", "basic", "segment", "judge0-message", "loading");
        if (!theme.isLight()) {
            aiMessage.classList.add("inverted");
        }
        messages.appendChild(aiMessage);
        messages.scrollTop = messages.scrollHeight;

        let aiResponseValue;
        const selectedModel = document.getElementById("judge0-chat-model-select").value;
        try {
            aiResponseValue = await getAIResponse(THREAD, selectedModel);
        } catch (err) {
            const modelName = selectedModel.replace(" (Ollama)", "");
            aiResponseValue = `
### ⚠️ Connection to Ollama Failed

I was unable to connect to your local Ollama instance at \`http://localhost:11434\` using the model **${modelName}**.

To run the AI assistant completely offline, please verify that:
1. **Ollama is installed and running** on your host machine.
2. **The model is downloaded** (run \`ollama pull ${modelName}\`).
3. **CORS is enabled** so your browser can communicate with Ollama.

---

#### How to Enable CORS (Fedora / Linux):

**Using systemd (standard Fedora setup):**
1. Edit the service settings:
   \`\`\`bash
   sudo systemctl edit ollama.service
   \`\`\`
2. Add this block to the file and save it:
   \`\`\`ini
   [Service]
   Environment="OLLAMA_ORIGINS=*"
   \`\`\`
3. Reload configurations and restart Ollama:
   \`\`\`bash
   sudo systemctl daemon-reload
   sudo systemctl restart ollama
   \`\`\`

**Using command line directly:**
\`\`\`bash
OLLAMA_ORIGINS="*" ollama serve
\`\`\`
`.trim();
        }

        THREAD.push({
            role: "assistant",
            content: aiResponseValue
        });

        aiMessage.innerHTML = DOMPurify.sanitize(aiResponseValue);
        renderMathInElement(aiMessage, {
            delimiters: [
                { left: "\\(", right: "\\)", display: false },
                { left: "\\[", right: "\\]", display: true }
            ]
        });
        aiMessage.innerHTML = marked.parse(aiMessage.innerHTML);

        aiMessage.classList.remove("loading");
        messages.scrollTop = messages.scrollHeight;

        userInput.disabled = false;
        sendButton.classList.remove("loading");
        userInput.focus();
    });

    document.getElementById("judge0-chat-model-select").addEventListener("change", function () {
        const userInput = document.getElementById("judge0-chat-user-input");
        userInput.placeholder = `Message ${this.value}`;
    });

    loadOllamaModels();
});

document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
            case "p":
                if (!configuration.get("appOptions.showAIAssistant")) {
                    break;
                }
                e.preventDefault();
                document.getElementById("judge0-chat-user-input").focus();
                break;
        }
    }
});
