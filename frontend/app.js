const API = "http://localhost:4000";


const form = document.getElementById("shorten-form");
const urlInput = document.getElementById("url-input");
const customInput = document.getElementById("custom-input");
const resultBox = document.getElementById("result");
const shortUrlEl = document.getElementById("short-url");
const copyBtn = document.getElementById("copy-btn");
const openBtn = document.getElementById("open-btn");
const errorBox = document.getElementById("error");

const themeToggle = document.getElementById("theme-toggle");
const themeIcon = document.getElementById("theme-icon");

(function initTheme() {
    const saved = localStorage.getItem("tinylink-theme");
    const prefersDark =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = saved || (prefersDark ? "dark" : "light");
    setTheme(theme);
})();

function setTheme(t) {
    if (t === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
        themeToggle.setAttribute("aria-pressed", "true");
        themeIcon.textContent = "☀️";
    } else {
        document.documentElement.removeAttribute("data-theme");
        themeToggle.setAttribute("aria-pressed", "false");
        themeIcon.textContent = "🌙";
    }
    localStorage.setItem("tinylink-theme", t);
}

themeToggle.addEventListener("click", () => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    setTheme(isDark ? "light" : "dark");
});

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();
    hideResult();

    const url = urlInput.value.trim();
    const custom = customInput.value.trim();

    if (!url) {
        showError("Please enter a URL.");
        return;
    }

    const submitBtn = document.getElementById("shorten-btn");
    submitBtn.disabled = true;
    submitBtn.style.opacity = "0.8";

    try {
        const res = await fetch(`${API}/api/shorten`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url, customCode: custom || undefined }),
        });

        const data = await res.json();
        if (!res.ok) {
            showError(data.error || "Failed to shorten URL.");
            submitBtn.disabled = false;
            submitBtn.style.opacity = "1";
            return;
        }

        shortUrlEl.textContent = data.shortUrl;
        openBtn.href = data.shortUrl;
        showResult();
    } catch {
        showError("Network error. Try again.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.style.opacity = "1";
    }
});

copyBtn.addEventListener("click", async () => {
    try {
        await navigator.clipboard.writeText(shortUrlEl.textContent);
        copyBtn.textContent = "Copied!";
        setTimeout(() => (copyBtn.textContent = "Copy"), 1500);
    } catch { }
});

function showResult() {
    resultBox.style.display = "flex";
}

function hideResult() {
    resultBox.style.display = "none";
}

function showError(msg) {
    errorBox.textContent = msg;
    errorBox.style.display = "block";
}

function hideError() {
    errorBox.textContent = "";
    errorBox.style.display = "none";
}
