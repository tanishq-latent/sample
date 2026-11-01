// ================================================================
// 1. Options for the tap-to-select buttons
// ================================================================
const OPTIONS = {
  vehicle: [
    { value: "motorcycle", label: "🏍️ Motorcycle" },
    { value: "scooter", label: "🛵 Scooter" },
    { value: "bicycle", label: "🚲 Bicycle" },
    { value: "van", label: "🚐 Van" },
  ],
  traffic: [
    { value: "Low", label: "Low", color: "var(--low)" },
    { value: "Medium", label: "Medium", color: "var(--medium)" },
    { value: "High", label: "High", color: "var(--high)" },
    { value: "Jam", label: "Jam", color: "var(--jam)" },
  ],
  weather: [
    { value: "Sunny", label: "☀️ Sunny" },
    { value: "Cloudy", label: "☁️ Cloudy" },
    { value: "Windy", label: "💨 Windy" },
    { value: "Fog", label: "🌫️ Fog" },
    { value: "Stormy", label: "⛈️ Stormy" },
    { value: "Sandstorms", label: "🏜️ Sandstorm" },
  ],
  area: [
    { value: "Metropolitian", label: "Metro city" },
    { value: "Urban", label: "Urban" },
    { value: "Semi-Urban", label: "Semi-urban" },
    { value: "Other", label: "Other" },
  ],
  category: [
    ["Electronics", "💻"], ["Clothing", "👕"], ["Apparel", "🧥"], ["Shoes", "👟"],
    ["Grocery", "🥦"], ["Snacks", "🍪"], ["Kitchen", "🍳"], ["Home", "🛋️"],
    ["Books", "📚"], ["Toys", "🧸"], ["Sports", "🏏"], ["Outdoors", "⛺"],
    ["Cosmetics", "💄"], ["Skincare", "🧴"], ["Jewelry", "💍"], ["Pet Supplies", "🐾"],
  ].map(([value, emoji]) => ({ value, label: `<span class="emoji">${emoji}</span>${value}` })),
};

// Build the radio buttons from the lists above
document.querySelectorAll("[data-name]").forEach((box) => {
  const name = box.dataset.name;
  OPTIONS[name].forEach((opt, i) => {
    const label = document.createElement("label");
    label.className = "choice";
    if (opt.color) label.style.setProperty("--level", opt.color);
    label.innerHTML = `<input type="radio" name="${name}" value="${opt.value}" ${i === 0 ? "checked" : ""}><span>${opt.label}</span>`;
    box.appendChild(label);
  });
});

// ================================================================
// 2. Sample orders
// ================================================================
const SAMPLES = {
  calm: {
    store_latitude: 22.745049, store_longitude: 75.892471,
    drop_latitude: 22.765049, drop_longitude: 75.912471,
    order_time: "2022-03-20T09:15", agent_age: 30, agent_rating: 4.9,
    vehicle: "scooter", traffic: "Low", weather: "Sunny", area: "Urban", category: "Books",
  },
  rush: {
    store_latitude: 12.913041, store_longitude: 77.683237,
    drop_latitude: 13.043041, drop_longitude: 77.813237,
    order_time: "2022-03-18T19:30", agent_age: 24, agent_rating: 4.4,
    vehicle: "motorcycle", traffic: "High", weather: "Stormy", area: "Metropolitian", category: "Electronics",
  },
  jam: {
    store_latitude: 19.0760, store_longitude: 72.8777,
    drop_latitude: 19.1460, drop_longitude: 72.9277,
    order_time: "2022-03-16T18:45", agent_age: 38, agent_rating: 3.9,
    vehicle: "van", traffic: "Jam", weather: "Cloudy", area: "Metropolitian", category: "Home",
  },
};

const form = document.getElementById("order-form");

function fillForm(data) {
  for (const [key, value] of Object.entries(data)) {
    const field = form.elements[key];
    if (field instanceof RadioNodeList) {
      field.value = value;
    } else if (field) {
      field.value = value;
    }
  }
  updateSliders();
  updateMap();
}

document.querySelectorAll(".sample").forEach((btn) => {
  btn.addEventListener("click", () => fillForm(SAMPLES[btn.dataset.sample]));
});

// ================================================================
// 3. Live slider values
// ================================================================
function updateSliders() {
  document.getElementById("age-out").textContent = form.agent_age.value;
  document.getElementById("rating-out").textContent = Number(form.agent_rating.value).toFixed(1) + " ★";
}
form.agent_age.addEventListener("input", updateSliders);
form.agent_rating.addEventListener("input", updateSliders);

// ================================================================
// 4. Live map + distance (same formula as the notebook)
// ================================================================
function getDistanceKm() {
  const latDiff = Math.abs(Math.abs(+form.drop_latitude.value) - Math.abs(+form.store_latitude.value));
  const lonDiff = Math.abs(Math.abs(+form.drop_longitude.value) - Math.abs(+form.store_longitude.value));
  return (latDiff + lonDiff) * 111;
}

let routePoints = null;

function updateMap() {
  const dx = Math.abs(+form.drop_longitude.value) - Math.abs(+form.store_longitude.value);
  const dy = Math.abs(+form.drop_latitude.value) - Math.abs(+form.store_latitude.value);
  const span = Math.max(Math.abs(dx), Math.abs(dy), 0.0001);

  // Put store and customer inside the map, north = up
  const sx = 200 - (dx / span) * 130, sy = 130 + (dy / span) * 80;
  const ex = 200 + (dx / span) * 130, ey = 130 - (dy / span) * 80;
  routePoints = { sx, sy, ex, ey };

  // City-block route: first east/west, then north/south
  const path = `M ${sx} ${sy} H ${ex} V ${ey}`;
  document.getElementById("route").setAttribute("d", path);
  document.getElementById("route-bg").setAttribute("d", path);
  document.getElementById("pin-store").setAttribute("transform", `translate(${sx} ${sy})`);
  document.getElementById("pin-drop").setAttribute("transform", `translate(${ex} ${ey})`);

  document.getElementById("distance").textContent = getDistanceKm().toFixed(1);
}

["store_latitude", "store_longitude", "drop_latitude", "drop_longitude"].forEach((name) => {
  form.elements[name].addEventListener("input", updateMap);
});

// Rider dot moves along the route when a result arrives
function animateRider() {
  const rider = document.getElementById("rider");
  const route = document.getElementById("route");
  const total = route.getTotalLength();
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion || total === 0) {
    const end = route.getPointAtLength(total);
    rider.setAttribute("cx", end.x);
    rider.setAttribute("cy", end.y);
    return;
  }

  const duration = 1400;
  const start = performance.now();
  function step(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    const p = route.getPointAtLength(total * eased);
    rider.setAttribute("cx", p.x);
    rider.setAttribute("cy", p.y);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ================================================================
// 5. Send the order to the API
// ================================================================
const result = document.getElementById("result");
const errorBox = document.getElementById("error");
const button = document.getElementById("submit-btn");

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function showError(message) {
  errorBox.textContent = message;
  result.className = "result is-error";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  // Collect all values from the form
  const data = Object.fromEntries(new FormData(form));
  const payload = {
    agent_age: Number(data.agent_age),
    agent_rating: Number(data.agent_rating),
    store_latitude: Number(data.store_latitude),
    store_longitude: Number(data.store_longitude),
    drop_latitude: Number(data.drop_latitude),
    drop_longitude: Number(data.drop_longitude),
    order_time: data.order_time,
    weather: data.weather,
    traffic: data.traffic,
    vehicle: data.vehicle,
    area: data.area,
    category: data.category,
  };

  if (!data.store_latitude || !data.drop_latitude || !data.store_longitude || !data.drop_longitude) {
    showError("Add the latitude and longitude for both the store and the customer.");
    return;
  }
  if (!data.order_time) {
    showError("Choose when the order was placed.");
    return;
  }

  button.disabled = true;
  button.textContent = "Estimating…";

  try {
    const response = await fetch("/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json();

    if (!response.ok) {
      // 422 = Pydantic validation error (a list), 400 = our own error (a string)
      const message = Array.isArray(body.detail)
        ? body.detail.map((d) => `${d.loc[d.loc.length - 1]}: ${d.msg}`).join("\n")
        : body.detail;
      showError(message);
      return;
    }

    // Work out the clock times
    const placed = new Date(data.order_time);
    const arrival = new Date(placed.getTime() + body.eta_minutes * 60000);
    const midway = new Date(placed.getTime() + (body.eta_minutes * 60000) / 2);

    document.getElementById("arrival-time").textContent = formatTime(arrival);
    document.getElementById("eta-minutes").textContent = Math.round(body.eta_minutes);
    document.getElementById("t-start").textContent = formatTime(placed);
    document.getElementById("t-mid").textContent = formatTime(midway);
    document.getElementById("t-end").textContent = formatTime(arrival);

    result.className = "result is-done";
    animateRider();

    if (window.innerWidth <= 900) result.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (err) {
    showError("Can't reach the API. Check that the server is running, then try again.");
  } finally {
    button.disabled = false;
    button.textContent = "Estimate delivery time";
  }
});

// ================================================================
// 6. Start with a sample order already filled in
// ================================================================
fillForm(SAMPLES.rush);
