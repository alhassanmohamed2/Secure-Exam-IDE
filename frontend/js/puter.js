"use strict";

export const IS_PUTER = puter.env === "app";

export function usePuter() {
    return IS_PUTER || puter.auth.isSignedIn();
}

const CLOUD_MODELS = new Set([
    "gpt-4o-mini", "gpt-4o", "o3-mini", "o1-mini",
    "claude-3-5-sonnet", "deepseek-chat", "deepseek-reasoner",
    "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
    "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
    "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
    "mistral-large-latest", "pixtral-large-latest", "codestral-latest",
    "google/gemma-2-27b-it", "grok-beta"
]);

async function uiSignIn() {
    if (puter.auth.isSignedIn()) {
        document.getElementById("judge0-sign-in-btn").classList.add("judge0-hidden");
        const signOutBtn = document.getElementById("judge0-sign-out-btn");
        signOutBtn.classList.remove("judge0-hidden");
        signOutBtn.querySelector("#judge0-puter-username").innerText = (await puter.auth.getUser()).username;
    } else {
        document.getElementById("judge0-sign-in-btn").classList.add("judge0-hidden");
        document.getElementById("judge0-sign-out-btn").classList.add("judge0-hidden");
    }

    const modelSelect = document.getElementById("judge0-chat-model-select");
    const dropdown = modelSelect.closest(".ui.selection.dropdown");
    if (dropdown) {
        dropdown.classList.remove("disabled");
    }

    const userInput = document.getElementById("judge0-chat-user-input");
    userInput.disabled = false;
    userInput.placeholder = `Message ${modelSelect.value}`;

    document.getElementById("judge0-chat-send-button").disabled = false;
    document.getElementById("judge0-inline-suggestions").disabled = false;
}

function uiSignOut() {
    document.getElementById("judge0-sign-in-btn").classList.remove("judge0-hidden");
    const signOutBtn = document.getElementById("judge0-sign-out-btn");
    signOutBtn.classList.add("judge0-hidden");
    signOutBtn.querySelector("#judge0-puter-username").innerText = "Sign out";

    const modelSelect = document.getElementById("judge0-chat-model-select");
    const dropdown = modelSelect.closest(".ui.selection.dropdown");
    if (dropdown) {
        dropdown.classList.add("disabled");
    }

    const userInput = document.getElementById("judge0-chat-user-input");
    userInput.disabled = true;
    userInput.placeholder = `Sign in to chat with ${modelSelect.value}`;

    document.getElementById("judge0-chat-send-button").disabled = true;
    document.getElementById("judge0-inline-suggestions").disabled = true;
}

function updateSignInUI() {
    const modelSelect = document.getElementById("judge0-chat-model-select");
    const isOllama = modelSelect && !CLOUD_MODELS.has(modelSelect.value);

    if (puter.auth.isSignedIn() || isOllama) {
        uiSignIn();
    } else {
        uiSignOut();
    }
}

async function signIn() {
    await puter.auth.signIn();
    updateSignInUI();
}

function signOut() {
    puter.auth.signOut();
    updateSignInUI();
}

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("judge0-sign-in-btn").addEventListener("click", signIn);
    document.getElementById("judge0-sign-out-btn").addEventListener("click", signOut);

    const modelSelect = document.getElementById("judge0-chat-model-select");
    if (modelSelect) {
        modelSelect.addEventListener("change", updateSignInUI);
    }

    updateSignInUI();
});
