(function () {
  "use strict";

  const TOKEN_KEY = "praxedis-admin-token";
  const DAY_MS = 24 * 60 * 60 * 1000;

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

  const token = readToken();
  if (!token) {
    globalThis.location.replace("/admin/login");
    return;
  }

  const elements = {
    navCount: document.getElementById("nav-count"),
    serviceDot: document.getElementById("service-dot"),
    serviceStatus: document.getElementById("service-status"),
    logout: document.getElementById("logout-button"),
    refresh: document.getElementById("refresh-button"),
    export: document.getElementById("export-button"),
    retry: document.getElementById("retry-button"),
    search: document.getElementById("lead-search"),
    sort: document.getElementById("lead-sort"),
    filters: Array.from(document.querySelectorAll(".filter-button")),
    total: document.getElementById("metric-total"),
    week: document.getElementById("metric-week"),
    phone: document.getElementById("metric-phone"),
    latest: document.getElementById("metric-latest"),
    resultsCount: document.getElementById("results-count"),
    syncTime: document.getElementById("sync-time"),
    loading: document.getElementById("loading-state"),
    error: document.getElementById("error-state"),
    errorMessage: document.getElementById("error-message"),
    empty: document.getElementById("empty-state"),
    tableWrap: document.getElementById("table-wrap"),
    tableBody: document.getElementById("waitlist-body"),
    dialog: document.getElementById("lead-dialog"),
    dialogClose: document.getElementById("dialog-close"),
    detailBusiness: document.getElementById("detail-business"),
    detailContact: document.getElementById("detail-contact"),
    detailCreated: document.getElementById("detail-created"),
    detailEmail: document.getElementById("detail-email"),
    detailPhone: document.getElementById("detail-phone"),
    detailNeed: document.getElementById("detail-need"),
    emailAction: document.getElementById("email-action"),
    phoneAction: document.getElementById("phone-action"),
    toast: document.getElementById("admin-toast"),
  };

  if (
    Object.values(elements).some(function (element) {
      return element === null;
    })
  ) {
    return;
  }

  const state = {
    entries: [],
    query: "",
    days: "all",
    sort: "newest",
    loaded: false,
    toastTimer: null,
  };

  const shortDate = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const shortTime = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const fullDate = new Intl.DateTimeFormat(undefined, {
    dateStyle: "long",
    timeStyle: "short",
  });

  function expireSession() {
    clearToken();
    globalThis.location.replace("/admin/login?expired=1");
  }

  function authorizedFetch(path, options) {
    const requestOptions = options || {};
    const headers = new Headers(requestOptions.headers || {});
    headers.set("authorization", `Bearer ${token}`);

    return fetch(path, {
      ...requestOptions,
      headers,
    });
  }

  function text(value) {
    return typeof value === "string" ? value : String(value ?? "");
  }

  function normalizeEntry(value) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return null;
    }

    return {
      id: text(value.id),
      businessName: text(value.businessName),
      contactName: text(value.contactName),
      email: text(value.email),
      phone: text(value.phone),
      need: text(value.need),
      createdAt: text(value.createdAt),
      source: text(value.source),
    };
  }

  function timestamp(entry) {
    const value = Date.parse(entry.createdAt);
    return Number.isFinite(value) ? value : 0;
  }

  function dateParts(entry) {
    const value = timestamp(entry);
    if (value === 0) {
      return { date: "Unknown", time: "" };
    }

    const date = new Date(value);
    return {
      date: shortDate.format(date),
      time: shortTime.format(date),
    };
  }

  function mailto(email) {
    return `mailto:${email}`;
  }

  function telephone(phone) {
    return `tel:${phone.replace(/[^\d+]/g, "")}`;
  }

  function showToast(message, isError) {
    if (state.toastTimer !== null) {
      globalThis.clearTimeout(state.toastTimer);
    }

    elements.toast.textContent = message;
    elements.toast.classList.toggle("is-error", Boolean(isError));
    elements.toast.hidden = false;
    state.toastTimer = globalThis.setTimeout(function () {
      elements.toast.hidden = true;
      state.toastTimer = null;
    }, 3500);
  }

  function setRefreshBusy(busy) {
    elements.refresh.disabled = busy;
    const icon = elements.refresh.querySelector("i");
    if (icon) {
      icon.classList.toggle("fa-spin", busy);
    }
  }

  function setExportBusy(busy) {
    elements.export.disabled = busy;
    const icon = elements.export.querySelector("i");
    const label = elements.export.querySelector("span");
    if (icon) {
      icon.className = busy
        ? "fa-solid fa-circle-notch fa-spin"
        : "fa-solid fa-file-arrow-down";
    }
    if (label) {
      label.textContent = busy ? "Exporting" : "Export CSV";
    }
  }

  function renderMetrics() {
    const now = Date.now();
    const recent = state.entries.filter(function (entry) {
      return timestamp(entry) >= now - 7 * DAY_MS;
    }).length;
    const withPhone = state.entries.filter(function (entry) {
      return entry.phone.trim().length > 0;
    }).length;
    const newest = state.entries.reduce(function (latest, entry) {
      return timestamp(entry) > timestamp(latest) ? entry : latest;
    }, { createdAt: "" });

    elements.total.textContent = String(state.entries.length);
    elements.week.textContent = String(recent);
    elements.phone.textContent = String(withPhone);
    elements.navCount.textContent = String(state.entries.length);

    if (timestamp(newest) === 0) {
      elements.latest.textContent = "None";
    } else {
      const parts = dateParts(newest);
      elements.latest.textContent = `${parts.date}, ${parts.time}`;
    }
  }

  function filteredEntries() {
    const query = state.query.trim().toLowerCase();
    const cutoff = state.days === "all"
      ? 0
      : Date.now() - Number(state.days) * DAY_MS;

    const entries = state.entries.filter(function (entry) {
      if (cutoff > 0 && timestamp(entry) < cutoff) {
        return false;
      }

      if (query.length === 0) {
        return true;
      }

      return [
        entry.businessName,
        entry.contactName,
        entry.email,
        entry.phone,
        entry.need,
      ].some(function (value) {
        return value.toLowerCase().includes(query);
      });
    });

    entries.sort(function (a, b) {
      if (state.sort === "oldest") {
        return timestamp(a) - timestamp(b);
      }
      if (state.sort === "business") {
        return a.businessName.localeCompare(b.businessName, undefined, {
          sensitivity: "base",
        });
      }
      return timestamp(b) - timestamp(a);
    });

    return entries;
  }

  function createCell(label) {
    const cell = document.createElement("td");
    cell.dataset.label = label;
    return cell;
  }

  function openDetails(entry) {
    const created = timestamp(entry) === 0
      ? "Unknown"
      : fullDate.format(new Date(timestamp(entry)));

    elements.detailBusiness.textContent = entry.businessName;
    elements.detailContact.textContent = entry.contactName;
    elements.detailCreated.textContent = created;
    elements.detailEmail.textContent = entry.email;
    elements.detailEmail.href = mailto(entry.email);
    elements.detailPhone.textContent = entry.phone;
    elements.detailPhone.href = telephone(entry.phone);
    elements.detailNeed.textContent = entry.need;
    elements.emailAction.href = mailto(entry.email);
    elements.phoneAction.href = telephone(entry.phone);

    if (typeof elements.dialog.showModal === "function") {
      elements.dialog.showModal();
    } else {
      elements.dialog.setAttribute("open", "");
    }
  }

  function createRow(entry) {
    const row = document.createElement("tr");

    const business = createCell("Business");
    const businessWrap = document.createElement("div");
    businessWrap.className = "business-cell";
    const businessName = document.createElement("strong");
    businessName.textContent = entry.businessName;
    const source = document.createElement("span");
    source.textContent = entry.source === "homepage" ? "Homepage" : "Website";
    businessWrap.append(businessName, source);
    business.append(businessWrap);

    const contact = createCell("Contact");
    const contactWrap = document.createElement("div");
    contactWrap.className = "contact-cell";
    const contactName = document.createElement("strong");
    contactName.textContent = entry.contactName;
    const email = document.createElement("a");
    email.href = mailto(entry.email);
    email.textContent = entry.email;
    contactWrap.append(contactName, email);
    contact.append(contactWrap);

    const phone = createCell("Phone");
    const phoneLink = document.createElement("a");
    phoneLink.className = "table-link";
    phoneLink.href = telephone(entry.phone);
    phoneLink.textContent = entry.phone;
    phone.append(phoneLink);

    const need = createCell("Need");
    const needText = document.createElement("div");
    needText.className = "need-cell";
    needText.textContent = entry.need;
    needText.title = entry.need;
    need.append(needText);

    const received = createCell("Received");
    const receivedWrap = document.createElement("div");
    receivedWrap.className = "date-cell";
    const parts = dateParts(entry);
    const receivedDate = document.createElement("strong");
    receivedDate.textContent = parts.date;
    const receivedTime = document.createElement("span");
    receivedTime.textContent = parts.time;
    receivedWrap.append(receivedDate, receivedTime);
    received.append(receivedWrap);

    const actions = createCell("Actions");
    const viewButton = document.createElement("button");
    viewButton.className = "icon-button row-action";
    viewButton.type = "button";
    viewButton.setAttribute(
      "aria-label",
      `View inquiry from ${entry.businessName}`,
    );
    viewButton.title = "View inquiry";
    const viewIcon = document.createElement("i");
    viewIcon.className = "fa-solid fa-chevron-right";
    viewIcon.setAttribute("aria-hidden", "true");
    viewButton.append(viewIcon);
    viewButton.addEventListener("click", function () {
      openDetails(entry);
    });
    actions.append(viewButton);

    row.append(business, contact, phone, need, received, actions);
    return row;
  }

  function renderEntries() {
    const entries = filteredEntries();
    const total = state.entries.length;
    elements.tableBody.replaceChildren(...entries.map(createRow));
    elements.resultsCount.textContent = entries.length === total
      ? `${total} ${total === 1 ? "lead" : "leads"}`
      : `Showing ${entries.length} of ${total} leads`;

    elements.loading.hidden = true;
    elements.error.hidden = true;
    elements.empty.hidden = entries.length > 0;
    elements.tableWrap.hidden = entries.length === 0;

    if (entries.length === 0) {
      const title = elements.empty.querySelector("strong");
      const message = elements.empty.querySelector("p");
      if (title && message) {
        if (total === 0) {
          title.textContent = "No inquiries yet";
          message.textContent = "New waitlist submissions will appear here.";
        } else {
          title.textContent = "No inquiries found";
          message.textContent = "Adjust the search or date filter.";
        }
      }
    }
  }

  function showInitialLoading() {
    elements.loading.hidden = false;
    elements.error.hidden = true;
    elements.empty.hidden = true;
    elements.tableWrap.hidden = true;
  }

  function showLoadError(message) {
    elements.loading.hidden = true;
    elements.error.hidden = false;
    elements.empty.hidden = true;
    elements.tableWrap.hidden = true;
    elements.errorMessage.textContent = message;
  }

  async function loadEntries(isRefresh) {
    if (!state.loaded) {
      showInitialLoading();
    }
    setRefreshBusy(true);

    try {
      const response = await authorizedFetch("/api/admin/waitlist?limit=500");
      if (response.status === 401) {
        expireSession();
        return;
      }

      const body = await response.json().catch(function () {
        return null;
      });
      if (!response.ok || !Array.isArray(body?.entries)) {
        throw new Error(
          body?.error?.message || "The server returned an invalid response.",
        );
      }

      state.entries = body.entries.map(normalizeEntry).filter(Boolean);
      state.loaded = true;
      renderMetrics();
      renderEntries();
      elements.syncTime.textContent = `Synced ${shortTime.format(new Date())}`;

      if (isRefresh) {
        showToast("Waitlist refreshed.", false);
      }
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Try refreshing the dashboard.";
      if (state.loaded) {
        showToast(`Refresh failed: ${message}`, true);
      } else {
        showLoadError(message);
      }
    } finally {
      setRefreshBusy(false);
    }
  }

  async function checkService() {
    try {
      const response = await fetch("/api/health", {
        headers: { accept: "application/json" },
      });
      const body = await response.json();
      if (!response.ok || body.status !== "ok") {
        throw new Error("Service unavailable");
      }
      elements.serviceStatus.textContent = "Online";
      elements.serviceDot.classList.remove("is-offline");
    } catch {
      elements.serviceStatus.textContent = "Unavailable";
      elements.serviceDot.classList.add("is-offline");
    }
  }

  async function exportCsv() {
    setExportBusy(true);

    try {
      const response = await authorizedFetch("/api/admin/waitlist.csv");
      if (response.status === 401) {
        expireSession();
        return;
      }
      if (!response.ok) {
        throw new Error("CSV export failed.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `praxedis-waitlist-${date}.csv`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showToast("CSV export downloaded.", false);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "CSV export failed.";
      showToast(message, true);
    } finally {
      setExportBusy(false);
    }
  }

  elements.logout.addEventListener("click", function () {
    clearToken();
    globalThis.location.replace("/admin/login");
  });

  elements.refresh.addEventListener("click", function () {
    loadEntries(true);
  });

  elements.retry.addEventListener("click", function () {
    loadEntries(false);
  });

  elements.export.addEventListener("click", exportCsv);

  elements.search.addEventListener("input", function () {
    state.query = elements.search.value;
    renderEntries();
  });

  elements.sort.addEventListener("change", function () {
    state.sort = elements.sort.value;
    renderEntries();
  });

  elements.filters.forEach(function (button) {
    button.addEventListener("click", function () {
      state.days = button.dataset.days || "all";
      elements.filters.forEach(function (filter) {
        const active = filter === button;
        filter.classList.toggle("is-active", active);
        filter.setAttribute("aria-pressed", String(active));
      });
      renderEntries();
    });
  });

  elements.dialogClose.addEventListener("click", function () {
    elements.dialog.close();
  });

  elements.dialog.addEventListener("click", function (event) {
    if (event.target === elements.dialog) {
      elements.dialog.close();
    }
  });

  checkService();
  loadEntries(false);
})();
