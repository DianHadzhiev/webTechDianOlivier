  "use strict";

  const API_KEY = "0ce945cd"; 
  const API_BASE = `https://webtech.labs.vu.nl/api26/${API_KEY}`; //base api w api url

  //dom elements
  //putting all the html elements in a variable 
  const albumElement = document.getElementById("album");
  const yearsFilter = document.getElementById("yearFilters");
  const searchInput = document.getElementById("searchInput");
  const resetBtn = document.getElementById("resetBtn");
  const statusMsg = document.getElementById("statusMsg");

  const formEl = document.getElementById("mediaForm") || document.getElementById("image-form");
  const openFormBtn = document.getElementById("open-form-btn");
  const successMsgEl = document.querySelector(".success-message");

  const MODAL_ID = "image-form-modal";

  //state variables
  let items = []; //store fetched media item
  let selectedYear = null; //selected year filter
  let searchTerm = ""; //search input

  function setStatus(msg, isError = false) { //if msg status doesnt exist --> stops and updates msg 
    if (!statusMsg) return;
    statusMsg.textContent = msg;
    statusMsg.classList.toggle("status-error", isError);
  }

  function showSuccess(msg) { //shows success button/text and makes it disappear after 3s
    if (!successMsgEl) return;
    successMsgEl.textContent = msg;
    successMsgEl.style.display = "inline-block";
    setTimeout(() => {
      successMsgEl.style.display = "none";
    }, 3000);
  }

  function normalize(str) { //makes the text safe for searching
    return String(str ?? "").trim().toLowerCase();
  }

  function getUniqueYears(data) { //extracting unique years from the item list
    const years = new Set();
    for (const it of data) { //loops through all items --> adds year if exists
      if (it && it.year !== undefined && it.year !== null) years.add(Number(it.year));
    }
    return Array.from(years).sort((a, b) => b - a); //sort new --> old
  }

  function applyFilters(data) { //filters items by year and term
    const term = normalize(searchTerm);

    return data.filter((it) => { //check item match w year
      const yearOk = selectedYear === null ? true : Number(it.year) === selectedYear;
      if (!term) return yearOk; //no search term --> filter by year

      //checks name and/or genre match search term
      const nameOk = normalize(it.name).includes(term);
      const genreOk = normalize(it.genre).includes(term);
      return yearOk && (nameOk || genreOk);
    });
  }

  function makeYearButton(label, yearValue) { //creates button for year filtering
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "year-btn";
    btn.textContent = label;

    //check if button = selectedYear
    const isActive = selectedYear === yearValue;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-pressed", String(isActive));
    //togle year filter when button pressed
    btn.addEventListener("click", () => {
      selectedYear = selectedYear === yearValue ? null : yearValue;
      refreshUI();
    });

    return btn;
  }

  function renderYearButtons() { //all year button filter in UI
    if (!yearsFilter) return;

    const years = getUniqueYears(items);
    yearsFilter.innerHTML = "";
    yearsFilter.appendChild(makeYearButton("All", null)); //'all' button 

    for (const y of years) { //add button for each year
      yearsFilter.appendChild(makeYearButton(String(y), y));
    }
  }

  function renderCard(item) { //creates card for one media item
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
    return card; //gives card w all the elements
  }

  function renderAlbum() { //displays all media cards in album section
    if (!albumElement) return; //album container missing --> exit

    albumElement.innerHTML = "";
    const filtered = applyFilters(items);

    if (filtered.length === 0) { //shows msg if no match
      const p = document.createElement("p");
      p.textContent = "No items match the selected filter.";
      albumElement.appendChild(p);
      return;
    }
    //
    const fragment = document.createDocumentFragment();
    for (const item of filtered) fragment.appendChild(renderCard(item)); //card added for each item
    albumElement.appendChild(fragment); 
  }

  function refreshUI() { //after change in state --> update UI parts 
    renderYearButtons();
    renderAlbum();

    if (selectedYear === null) setStatus("Showing all years"); //update status msg
    else setStatus(`Filtering year: ${selectedYear}`);
  }

  async function loadItems() { //fetches media item from api and modify UI
    setStatus("Loading album...");
    try {
      const response = await fetch(API_BASE); //requests data api
      if (!response.ok) throw new Error(`GET failed (${response.status})`);

      const data = await response.json(); //analyze json response 
      items = Array.isArray(data) ? data : [];
      refreshUI(); //refreshes UI w loaded data
      setStatus("Album loaded");
    } catch (err) {
      console.error(err); //error for debugging
      setStatus("Failed to load album", true);
    }
  }

  async function resetDatabase() { //resets database to its og state 
    setStatus("Resetting database...");
    try { 
      const res = await fetch(`${API_BASE}/reset`);
      if (!res.ok) throw new Error(`RESET failed (${res.status})`); //if reset fails --> reload item, otherwise error

      await loadItems();
      setStatus("Database reset");
    } catch (err) {
      console.error(err);
      setStatus("Failed to reset database", true);
    }
  }

  async function postNewItem(payload) { //sends new item to api and stores it in database
    setStatus("Adding item...");
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`POST failed (${res.status})`); //if post failed --> error

    await loadItems({silent:true});
  }

  function wireFormSubmit() { //forms submissions and creates new items
    if (!formEl) return;

    formEl.addEventListener("submit", async (e) => { //stops page reloading
      e.preventDefault();

      const payload = { //collects data from inputs
        poster: document.getElementById("poster")?.value?.trim() ?? "",
        name: document.getElementById("name")?.value?.trim() ?? "",
        year: Number(document.getElementById("year")?.value),
        genre: document.getElementById("genre")?.value?.trim() ?? "",
        description: document.getElementById("description")?.value?.trim() ?? "",
      };

      if (!payload.poster || !payload.name || !payload.year || !payload.genre || !payload.description) {
        setStatus("Fill in all fields before submitting.", true); //checks if everything is filled in
        return;
      }

      try { //sends new items to api
        await postNewItem(payload);
        selectedYear = null;
        searchTerm = "";
        if (searchInput) searchInput.value = "";
        formEl.reset(); //clears form inputs
        showSuccess("Game successfully added!");
        setStatus("Item added.");

        if (window.MicroModal && document.getElementById(MODAL_ID)) { //closes modal if MM is available
          window.MicroModal.close(MODAL_ID) ;
        }
      } catch (err) { //error if not available
        console.error(err);
        setStatus("Failed to add item.", true);
      }
    });
  }

  function wireModalOpen() { //opens modal when button is clicked
    if (!openFormBtn) return;
    if (!window.MicroModal) return;
    if (!document.getElementById(MODAL_ID)) return;

    window.MicroModal.init();

    openFormBtn.addEventListener("click", () => {
      window.MicroModal.show(MODAL_ID); //open modal
    });
  }

  function wireEvents() { //connects UI el to events
    if (searchInput) { //updates search term 
      searchInput.addEventListener("input", (e) => {
        searchTerm = e.target.value;
        refreshUI();
      });
    }

    if (resetBtn) { //reset database when clicked
      resetBtn.addEventListener("click", resetDatabase);
    }
  }

  function init() { //starts application
    wireEvents();
    wireFormSubmit();
    wireModalOpen();
    loadItems();
  }

  if (document.readyState === "loading") { //ensuring dom is loaded before running
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
