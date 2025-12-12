// Elementos del DOM
const searchInput = document.getElementById("search-input");
const categorySelect = document.getElementById("category-select");
const locationsListEl = document.getElementById("locations-list");
const resultsCountEl = document.getElementById("results-count");

let allFeatures = [];
let filteredFeatures = [];
let markersLayer = L.layerGroup();
let activeId = null;

// 🌍 Inicializar mapa (podés ajustar el centro y el zoom)
const map = L.map("map", {
  zoomControl: true
}).setView([-25.3010, -57.6300], 17);

// Capa base
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 20,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> colaboradores'
}).addTo(map);

// Ícono personalizado simple
const blueMarker = L.icon({
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  shadowSize: [41, 41]
});

// 📥 Cargar GeoJSON
async function loadData() {
  try {
    const res = await fetch("data/locations.geojson");
    const geojson = await res.json();
    allFeatures = geojson.features || [];
    filteredFeatures = [...allFeatures];
    // 🔐 Crear ID interno único para cada punto
allFeatures.forEach((feat, index) => {
  feat._uid = String(index);
});

    buildCategoryFilter();
    renderMarkers();
    renderList();
    fitMapToData();
  } catch (err) {
    console.error("Error cargando GeoJSON:", err);
    locationsListEl.innerHTML =
      '<div class="no-results">No se pudo cargar locations.geojson</div>';
  }
}

// Construir opciones de categoría
function buildCategoryFilter() {
  const categories = new Set();
  allFeatures.forEach((feat) => {
    const cat = feat.properties?.category || "Sin categoría";
    categories.add(cat);
  });

  categories.forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    categorySelect.appendChild(opt);
  });
}

// Crear marcadores
function renderMarkers() {
  markersLayer.clearLayers();

  filteredFeatures.forEach((feat) => {
    const coords = feat.geometry?.coordinates;
    if (!coords || coords.length < 2) return;

    const [lng, lat] = coords;
    const { id, name, description, category } = feat.properties;

    const marker = L.marker([lat, lng], { icon: blueMarker }).bindPopup(
      `
        <strong>${name || "Sin nombre"}</strong><br/>
        <span>${description || ""}</span><br/>
        <small style="color:#6b7280">Categoría: ${
          category || "N/A"
        }</small>
      `
    );

    marker.on("click", () => {
      activeId = feat._uid;
      renderList();
    });

    markersLayer.addLayer(marker);

    // Guardamos referencia en la feature
    feat._leafletMarker = marker;
  });

  markersLayer.addTo(map);
}

// Lista lateral
function renderList() {
  locationsListEl.innerHTML = "";

  if (!filteredFeatures.length) {
    locationsListEl.innerHTML =
      '<div class="no-results">No se encontraron lugares con ese criterio.</div>';
  } else {
    filteredFeatures.forEach((feat) => {
      const { id, name, description, category } = feat.properties;

      const item = document.createElement("div");
      item.className =
        "location-item" + (feat._uid === activeId ? " active" : "");

      const titleEl = document.createElement("div");
      titleEl.className = "location-name";
      titleEl.textContent = name || "Sin nombre";

      const descEl = document.createElement("div");
      descEl.className = "location-desc";
      descEl.textContent = description || "";

      const metaEl = document.createElement("div");
      metaEl.className = "location-meta";
      metaEl.textContent = `Categoría: ${category || "N/A"}`;

      item.appendChild(titleEl);
      item.appendChild(descEl);
      item.appendChild(metaEl);

      item.addEventListener("click", () => {
        focusFeature(feat._uid);
      });

      locationsListEl.appendChild(item);
    });
  }

  resultsCountEl.textContent = `(${filteredFeatures.length})`;
}

// Enfocar uno en el mapa
function focusFeature(uid) {
  const feat = allFeatures.find(f => f._uid === String(uid));
  if (!feat) return;

  const coords = feat.geometry?.coordinates;
  if (!coords || coords.length < 2) return;

  const [lng, lat] = coords;

  activeId = String(uid);

  map.setView([lat, lng], 18, { animate: true });

  if (feat._leafletMarker) {
    feat._leafletMarker.openPopup();
  }

  renderList();
}

// Aplicar filtros
function applyFilters() {
  const text = searchInput.value.trim().toLowerCase();

  filteredFeatures = allFeatures.filter((feat) => {
    const props = feat.properties || {};
    const name = (props.name || "").toLowerCase();
    return !text || name.includes(text);
  });

  renderMarkers();
  renderList();
  fitMapToData();
}

// Ajustar vista a todos los puntos filtrados
function fitMapToData() {
  const latlngs = [];
  filteredFeatures.forEach((feat) => {
    const coords = feat.geometry?.coordinates;
    if (!coords || coords.length < 2) return;
    const [lng, lat] = coords;
    latlngs.push([lat, lng]);
  });

  if (latlngs.length === 0) return;

  const bounds = L.latLngBounds(latlngs);
  map.fitBounds(bounds, { padding: [20, 20] });
}

// Eventos
searchInput.addEventListener("input", () => {
  applyFilters();
});

categorySelect.addEventListener("change", () => {
  applyFilters();
});

// Inicializar
loadData();






