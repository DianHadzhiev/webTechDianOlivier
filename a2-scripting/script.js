  "use strict";

  const API_KEY = "0ce945cd";
  const API_BASE = `https://webtech.labs.vu.nl/api26/${API_KEY}`;

  const albumElement = document.getElementById("album");
  const yearsFilter = document.getElementById("yearFilters");
  const searchInput = document.getElementById("searchInput");
  const resetBtn = document.getElementById("resetBtn");
  const statusMsg = document.getElementById("statusMsg");

  const formEl = document.getElementById("mediaForm") || document.getElementById("image-form");
  const openFormBtn = document.getElementById("open-form-btn");
  const successMsgEl = document.querySelector(".success-message");

  const MODAL_ID = "image-form-modal";

  let items = [];
  let selectedYear = null;
  let searchTerm = "";

  function setStatus(msg, isError = false) {
    if (!statusMsg) return;
    statusMsg.textContent = msg;
    statusMsg.classList.toggle("status-error", isError);
  }

  function showSuccess(msg) {
    if (!successMsgEl) return;
    successMsgEl.textContent = msg;
    successMsgEl.style.display = "inline-block";
    setTimeout(() => {
      successMsgEl.style.display = "none";
    }, 3000);
  }

  function normalize(str) {
    return String(str ?? "").trim().toLowerCase();
  }

  function getUniqueYears(data) {
    const years = new Set();
    for (const it of data) {
      if (it && it.year !== undefined && it.year !== null) years.add(Number(it.year));
    }
    return Array.from(years).sort((a, b) => b - a);
  }

  function applyFilters(data) {
    const term = normalize(searchTerm);

    return data.filter((it) => {
      const yearOk = selectedYear === null ? true : Number(it.year) === selectedYear;
      if (!term) return yearOk;

      const nameOk = normalize(it.name).includes(term);
      const genreOk = normalize(it.genre).includes(term);
      return yearOk && (nameOk || genreOk);
    });
  }

  function makeYearButton(label, yearValue) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "year-btn";
    btn.textContent = label;

    const isActive = selectedYear === yearValue;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-pressed", String(isActive));

    btn.addEventListener("click", () => {
      selectedYear = selectedYear === yearValue ? null : yearValue;
      refreshUI();
    });

    return btn;
  }

  function renderYearButtons() {
    if (!yearsFilter) return;

    const years = getUniqueYears(items);
    yearsFilter.innerHTML = "";
    yearsFilter.appendChild(makeYearButton("All", null));

    for (const y of years) {
      yearsFilter.appendChild(makeYearButton(String(y), y));
    }
  }

  function renderCard(item) {
    const card = document.createElement("article");
    card.className = "media-card";
    card.dataset.year = String(item.year ?? "");

    const img = document.createElement("img");
    img.className = "media-img";
    img.src = item.poster;
    img.alt = item.name ? `${item.name} poster` : "Media poster";
    img.loading = "lazy";

    const title = document.createElement("h3");
    title.className = "media-title";
    title.textContent = item.name ?? "Untitled";

    const meta = document.createElement("p");
    meta.className = "media-meta";
    meta.textContent = `${item.year ?? "?"} • ${item.genre ?? "Unknown genre"}`;

    const desc = document.createElement("p");
    desc.className = "media-desc";
    desc.textContent = item.description ?? "";

    card.append(img, title, meta, desc);
    return card;
  }

  function renderAlbum() {
    if (!albumElement) return;

    albumElement.innerHTML = "";
    const filtered = applyFilters(items);

    if (filtered.length === 0) {
      const p = document.createElement("p");
      p.textContent = "No items match the selected filter.";
      albumElement.appendChild(p);
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const item of filtered) fragment.appendChild(renderCard(item));
    albumElement.appendChild(fragment);
  }

  function refreshUI() {
    renderYearButtons();
    renderAlbum();

    if (selectedYear === null) setStatus("Showing all years");
    else setStatus(`Filtering year: ${selectedYear}`);
  }

  async function loadItems() {
    setStatus("Loading album...");
    try {
      const response = await fetch(API_BASE);
      if (!response.ok) throw new Error(`GET failed (${response.status})`);

      const data = await response.json();
      items = Array.isArray(data) ? data : [];
      refreshUI();
      setStatus("Album loaded");
    } catch (err) {
      console.error(err);
      setStatus("Failed to load album", true);
    }
  }

  async function resetDatabase() {
    setStatus("Resetting database...");
    try {
      const res = await fetch(`${API_BASE}/reset`);
      if (!res.ok) throw new Error(`RESET failed (${res.status})`);

      await loadItems();
      setStatus("Database reset");
    } catch (err) {
      console.error(err);
      setStatus("Failed to reset database", true);
    }
  }

  async function postNewItem(payload) {
    setStatus("Adding item...");
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`POST failed (${res.status})`);

    await loadItems();
  }

  function wireFormSubmit() {
    if (!formEl) return;

    formEl.addEventListener("submit", async (e) => {
      e.preventDefault();

      const payload = {
        poster: document.getElementById("poster")?.value?.trim() ?? "",
        name: document.getElementById("name")?.value?.trim() ?? "",
        year: Number(document.getElementById("year")?.value),
        genre: document.getElementById("genre")?.value?.trim() ?? "",
        description: document.getElementById("description")?.value?.trim() ?? "",
      };

      if (!payload.poster || !payload.name || !payload.year || !payload.genre || !payload.description) {
        setStatus("Fill in all fields before submitting.", true);
        return;
      }

      try {
        await postNewItem(payload);
        selectedYear = null;
        searchTerm = "";
        if (searchInput) searchInput.value = "";
        formEl.reset();
        showSuccess("Game successfully added!");
        setStatus("Item added.");

        if (window.MicroModal && document.getElementById(MODAL_ID)) {
          window.MicroModal.close(MODAL_ID);
        }
      } catch (err) {
        console.error(err);
        setStatus("Failed to add item.", true);
      }
    });
  }

  function wireModalOpen() {
    if (!openFormBtn) return;
    if (!window.MicroModal) return;
    if (!document.getElementById(MODAL_ID)) return;

    window.MicroModal.init();

    openFormBtn.addEventListener("click", () => {
      window.MicroModal.show(MODAL_ID);
    });
  }

  function wireEvents() {
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        searchTerm = e.target.value;
        refreshUI();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", resetDatabase);
    }
  }

  function init() {
    wireEvents();
    wireFormSubmit();
    wireModalOpen();
    loadItems();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

