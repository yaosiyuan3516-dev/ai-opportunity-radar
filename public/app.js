const state = {
  items: [],
  filter: "全部",
};

const cards = document.querySelector("#cards");
const totalCount = document.querySelector("#total-count");
const topScore = document.querySelector("#top-score");
const updateTime = document.querySelector("#update-time");
const buttons = [...document.querySelectorAll("[data-filter]")];
const categoryLabels = {
  全部: "All",
  远程工作: "Remote Jobs",
  "AI 工具": "AI Tools",
  开源项目: "Open Source",
  赚钱案例: "Monetization",
};

async function load() {
  applyConfig();
  const dataPath = window.location.pathname.includes("/public/") ? "../data/opportunities.json" : "./data/opportunities.json";
  const res = await fetch(dataPath, { cache: "no-store" });
  const data = await res.json();
  state.items = data.items || [];
  totalCount.textContent = state.items.length;
  topScore.textContent = Math.max(...state.items.map((item) => item.score || 0), 0);
  updateTime.textContent = new Date(data.generatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
  });
  render();
}

function render() {
  const items =
    state.filter === "全部"
      ? state.items
      : state.items.filter((item) => item.category === state.filter);

  cards.innerHTML = items
    .map(
      (item) => `
        <article class="card">
          <div class="card-top">
            <span class="tag">${escapeHtml(categoryLabels[item.category] || item.category)} · ${escapeHtml(item.source)}</span>
            <span class="score">${escapeHtml(String(item.score))}</span>
          </div>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.summary)}</p>
          <dl>
            <div class="row">
              <dt>Monetize</dt>
              <dd>${escapeHtml(item.monetization)}</dd>
            </div>
            <div class="row">
              <dt>Next</dt>
              <dd>${escapeHtml(item.action)}</dd>
            </div>
          </dl>
          <a href="${escapeAttr(item.url)}" target="_blank" rel="noreferrer">Open Source</a>
        </article>
      `,
    )
    .join("");
}

function applyConfig() {
  const config = window.RADAR_CONFIG || {};
  if (config.checkoutUrl) {
    document.querySelectorAll("[data-checkout]").forEach((link) => {
      const tier = link.getAttribute("data-checkout");
      link.href = config[`${tier}CheckoutUrl`] || config.checkoutUrl;
    });
  }
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[char];
  });
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

buttons.forEach((button) => {
  button.addEventListener("click", () => {
    state.filter = button.dataset.filter;
    buttons.forEach((item) => item.classList.toggle("active", item === button));
    render();
  });
});

load().catch(() => {
  cards.innerHTML = `<p>Opportunity data did not load. The next scheduled update will retry automatically.</p>`;
});
