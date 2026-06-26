(function () {
  "use strict";

  const TOKEN_KEY = "praxedis-admin-token";
  const form = document.getElementById("login-form");
  const passwordInput = document.getElementById("admin-password");
  const passwordToggle = document.getElementById("password-toggle");
  const submitButton = document.getElementById("login-submit");
  const status = document.getElementById("login-status");
  const notice = document.getElementById("login-notice");

  if (
    !form || !passwordInput || !passwordToggle || !submitButton || !status ||
    !notice
  ) {
    return;
  }

  function readToken() {
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  function clearToken() {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      // Storage can be unavailable in hardened browser modes.
    }
  }

  function storeToken(token) {
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
      return true;
    } catch {
      return false;
    }
  }

  function setStatus(message, success) {
    status.textContent = message;
    status.classList.toggle("is-success", success);
  }

  function setBusy(busy) {
    submitButton.disabled = busy;
    passwordInput.disabled = busy;
    passwordToggle.disabled = busy;

    const icon = submitButton.querySelector("i");
    const label = submitButton.querySelector("span");
    if (icon) {
      icon.className = busy
        ? "fa-solid fa-circle-notch fa-spin"
        : "fa-solid fa-right-to-bracket";
    }
    if (label) {
      label.textContent = busy ? "Signing in" : "Sign in";
    }
  }

  function errorMessage(response, body) {
    const code = body?.error?.code;
    if (code === "invalid_credentials") {
      return "The password is incorrect.";
    }
    if (code === "admin_not_configured") {
      return "Admin access is not configured on this server.";
    }
    if (code === "missing_password") {
      return "Enter your admin password.";
    }
    if (response.status >= 500) {
      return "The admin service is temporarily unavailable.";
    }
    return body?.error?.message || "Unable to sign in.";
  }

  const params = new URLSearchParams(globalThis.location.search);
  if (params.get("expired") === "1") {
    clearToken();
    notice.hidden = false;
  } else if (readToken()) {
    globalThis.location.replace("/admin");
    return;
  }

  passwordToggle.addEventListener("click", function () {
    const showing = passwordInput.type === "text";
    passwordInput.type = showing ? "password" : "text";
    passwordToggle.setAttribute(
      "aria-label",
      showing ? "Show password" : "Hide password",
    );
    passwordToggle.setAttribute(
      "title",
      showing ? "Show password" : "Hide password",
    );

    const icon = passwordToggle.querySelector("i");
    if (icon) {
      icon.className = showing ? "fa-solid fa-eye" : "fa-solid fa-eye-slash";
    }

    passwordInput.focus();
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    notice.hidden = true;
    setStatus("", false);

    const password = passwordInput.value;
    if (password.length === 0) {
      setStatus("Enter your admin password.", false);
      passwordInput.focus();
      return;
    }

    setBusy(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ password }),
      });
      const body = await response.json().catch(function () {
        return null;
      });

      if (!response.ok || typeof body?.token !== "string") {
        setStatus(errorMessage(response, body), false);
        passwordInput.select();
        return;
      }

      if (!storeToken(body.token)) {
        setStatus(
          "This browser blocked session storage. Allow site storage and try again.",
          false,
        );
        return;
      }

      setStatus("Access granted. Opening dashboard.", true);
      globalThis.location.replace("/admin");
    } catch {
      setStatus(
        "Unable to reach the server. Check the connection and retry.",
        false,
      );
    } finally {
      setBusy(false);
    }
  });
})();
