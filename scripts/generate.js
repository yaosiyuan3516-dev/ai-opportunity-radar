import { mkdir, readFile, writeFile } from "node:fs/promises";

const OUT_FILE = new URL("../data/opportunities.json", import.meta.url);
const REPORT_FILE = new URL("../public/report.html", import.meta.url);
const SOCIAL_FILE = new URL("../data/social-posts.md", import.meta.url);
const SPONSOR_FILE = new URL("../data/sponsor-kit.md", import.meta.url);
const PAID_REPORT_FILE = new URL("../deliverables/weekly-pro-report.html", import.meta.url);
const PAID_DATA_FILE = new URL("../deliverables/weekly-pro-data.json", import.meta.url);
const PUBLIC_LIMIT = 6;

const sources = [
  {
    name: "Hacker News",
    category: "AI 工具",
    url: "https://hn.algolia.com/api/v1/search_by_date?query=AI%20tool&tags=story&hitsPerPage=20",
    parse: async (res) => {
      const data = await res.json();
      return data.hits.map((item) => ({
        title: item.title || item.story_title,
        url: item.url || `https://news.ycombinator.com/item?id=${item.objectID}`,
        source: "Hacker News",
        category: "AI 工具",
        signal: Number(item.points || 0) + Number(item.num_comments || 0) * 2,
      }));
    },
  },
  {
    name: "Remote OK",
    category: "远程工作",
    url: "https://remoteok.com/api",
    parse: async (res) => {
      const data = await res.json();
      return data
        .filter((item) => item && item.position && item.url)
        .slice(0, 20)
        .map((item) => ({
          title: `${item.position} @ ${item.company || "Remote company"}`,
          url: item.url,
          source: "Remote OK",
          category: "远程工作",
          signal: Number(item.epoch || 0),
        }));
    },
  },
  {
    name: "GitHub Search",
    category: "开源项目",
    url: "https://api.github.com/search/repositories?q=ai+automation+created:%3E2026-05-01&sort=stars&order=desc&per_page=20",
    parse: async (res) => {
      const data = await res.json();
      return (data.items || []).map((repo) => ({
        title: repo.full_name,
        url: repo.html_url,
        source: "GitHub",
        category: "开源项目",
        signal: Number(repo.stargazers_count || 0),
      }));
    },
  },
];

const fallback = [
  {
    title: "AI 客服知识库搭建服务",
    url: "https://www.google.com/search?q=AI+customer+support+knowledge+base+service",
    source: "Seed",
    category: "赚钱案例",
    score: 86,
  },
  {
    title: "把公开招聘信息整理成中文远程岗位日报",
    url: "https://remoteok.com",
    source: "Seed",
    category: "远程工作",
    score: 82,
  },
  {
    title: "为本地商家做短视频脚本和发布日历",
    url: "https://www.google.com/search?q=local+business+short+video+content+calendar",
    source: "Seed",
    category: "赚钱案例",
    score: 79,
  },
  {
    title: "GitHub 开源项目中文教程站",
    url: "https://github.com/trending",
    source: "Seed",
    category: "开源项目",
    score: 76,
  },
];

function unique(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.title}|${item.url}`;
    if (!item.title || !item.url || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function enrich(item, index) {
  const score = item.score || Math.min(96, 52 + Math.round(Math.log10((item.signal || 1) + 1) * 18) + (index % 9));
  return {
    ...item,
    score,
    summary: makeSummary(item),
    monetization: makeMonetization(item.category),
    action: makeAction(item.category),
  };
}

function makeSummary(item) {
  const map = {
    "远程工作": "Useful for niche job digests, skill-demand briefs, resume reviews, and application support.",
    "AI 工具": "Useful for tool reviews, workflow templates, alternative comparisons, and setup consulting.",
    "开源项目": "Useful for tutorials, deployment services, documentation, wrappers, and team training.",
    "赚钱案例": "Useful for playbooks, templates, low-ticket consulting, and automation services.",
  };
  return map[item.category] || "Useful for testing user pain, paid demand, and automated delivery paths.";
}

function makeMonetization(category) {
  const map = {
    "远程工作": "Curated job alerts, resume reviews, application support",
    "AI 工具": "Affiliate revenue, workflow templates, tool consulting",
    "开源项目": "Deployment services, tutorials, team training",
    "赚钱案例": "Playbooks, automation setup, monthly advisory",
  };
  return map[category] || "Sponsor slots, paid reports, custom services";
}

function makeAction(category) {
  const map = {
    "远程工作": "Pick 5 roles and publish a focused niche job digest.",
    "AI 工具": "Write a short review with screenshots, use cases, and alternatives.",
    "开源项目": "Run the project once and publish a practical setup guide.",
    "赚钱案例": "Create a $4.99 playbook outline and test buyer intent first.",
  };
  return map[category] || "Publish a one-page offer and collect 10 buyer-intent signals.";
}

async function fetchSource(source) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "ai-opportunity-radar/0.1",
        Accept: "application/json",
      },
    });
    if (!res.ok) throw new Error(`${source.name} returned ${res.status}`);
    return await source.parse(res);
  } catch (error) {
    console.warn(`[warn] ${source.name}: ${error.message}`);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const fetched = (await Promise.all(sources.map(fetchSource))).flat();
  const previousItems = await readPreviousItems();
  const liveItems = fetched.length > 0 ? fetched : previousItems;
  const items = unique([...liveItems, ...fallback])
    .sort((a, b) => (b.signal || b.score || 0) - (a.signal || a.score || 0))
    .slice(0, 36)
    .map(enrich);

  const payload = {
    generatedAt: new Date().toISOString(),
    project: "AI Opportunity Radar",
    totalCount: items.length,
    publicCount: Math.min(PUBLIC_LIMIT, items.length),
    lockedCount: Math.max(0, items.length - PUBLIC_LIMIT),
    items: items.slice(0, PUBLIC_LIMIT),
  };

  const paidPayload = {
    generatedAt: payload.generatedAt,
    project: payload.project,
    totalCount: items.length,
    items,
  };

  await mkdir(new URL("../data/", import.meta.url), { recursive: true });
  await mkdir(new URL("../public/", import.meta.url), { recursive: true });
  await mkdir(new URL("../deliverables/", import.meta.url), { recursive: true });
  await writeFile(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await writeFile(REPORT_FILE, renderReport(payload), "utf8");
  await writeFile(PAID_REPORT_FILE, renderPaidReport(paidPayload), "utf8");
  await writeFile(PAID_DATA_FILE, `${JSON.stringify(paidPayload, null, 2)}\n`, "utf8");
  await writeFile(SOCIAL_FILE, renderSocialPosts(paidPayload), "utf8");
  await writeFile(SPONSOR_FILE, renderSponsorKit(paidPayload), "utf8");
  console.log(`Generated ${payload.publicCount} public samples, ${paidPayload.totalCount} paid opportunities, report, social posts, and sponsor kit.`);
}

async function readPreviousItems() {
  try {
    const data = JSON.parse(await readFile(OUT_FILE, "utf8"));
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
}

function renderReport(payload) {
  const top = payload.items.slice(0, PUBLIC_LIMIT);
  const rows = top
    .map(
      (item, index) => `
        <article class="report-item">
          <span>${index + 1}</span>
          <div>
            <h2>${escapeHtml(item.title)}</h2>
            <p>${escapeHtml(item.summary)}</p>
            <dl>
              <div><dt>Score</dt><dd>${escapeHtml(String(item.score))}</dd></div>
              <div><dt>Monetize</dt><dd>${escapeHtml(item.monetization)}</dd></div>
              <div><dt>Next</dt><dd>${escapeHtml(item.action)}</dd></div>
            </dl>
            <a href="${escapeAttr(item.url)}">Source</a>
          </div>
        </article>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>AI Opportunity Radar Weekly Report</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <main class="report-page">
      <section class="report-hero">
        <p class="eyebrow">Paid Sample</p>
        <h1>AI Opportunity Radar Weekly Report</h1>
        <p>This free sample shows ${payload.publicCount} source-linked opportunities. The paid products are for the full curated issue, category prioritization, and practical execution notes. We sell research, not guaranteed income.</p>
        <div class="product-actions">
          <a class="primary" data-checkout="starter" href="https://www.paypal.com/ncp/payment/YOUR_STARTER_LINK_ID">Starter $4.99</a>
          <a class="secondary" data-checkout="pro" href="https://www.paypal.com/ncp/payment/YOUR_PRO_LINK_ID">Weekly Pro $9.99</a>
        </div>
      </section>
      <section class="trust-band">
        <div>
          <strong>Source-linked research</strong>
          <span>Every item keeps a source link so buyers can verify the original signal.</span>
        </div>
        <div>
          <strong>No outcome guarantee</strong>
          <span>Scores are prioritization signals. This is not financial, legal, investment, or employment advice.</span>
        </div>
        <div>
          <strong>Final digital sale</strong>
          <span>Digital report access is delivered immediately. All sales are final after access is delivered, and custom after-sales service is not included.</span>
        </div>
      </section>
      <section class="report-list">${rows}</section>
      <section class="product-band">
        <div>
          <p class="eyebrow">Locked Content</p>
          <h2>${payload.lockedCount} additional signals are reserved for paid buyers</h2>
          <p>Starter includes a compact issue. Weekly Pro includes the full issue with 30-50 source-linked signals when enough quality signals are available.</p>
        </div>
        <div class="product-actions">
          <a class="primary" data-checkout="starter" href="https://www.paypal.com/ncp/payment/YOUR_STARTER_LINK_ID">Starter $4.99</a>
          <a class="secondary" data-checkout="pro" href="https://www.paypal.com/ncp/payment/YOUR_PRO_LINK_ID">Weekly Pro $9.99</a>
        </div>
      </section>
      <section class="final-note">
        Small independent operation. Digital content sales are final and non-refundable after access is delivered. No investment, legal, tax, employment, or income guarantee is provided.
      </section>
    </main>
    <script src="./config.js"></script>
    <script>
      const config = window.RADAR_CONFIG || {};
      if (config.checkoutUrl) {
        document.querySelectorAll("[data-checkout]").forEach((link) => {
          const tier = link.getAttribute("data-checkout");
          link.href = config[tier + "CheckoutUrl"] || config.checkoutUrl;
        });
      }
    </script>
  </body>
</html>`;
}

function renderPaidReport(payload) {
  const rows = payload.items
    .map(
      (item, index) => `
        <article class="report-item">
          <span>${index + 1}</span>
          <div>
            <h2>${escapeHtml(item.title)}</h2>
            <p>${escapeHtml(item.summary)}</p>
            <dl>
              <div><dt>Category</dt><dd>${escapeHtml(categoryLabel(item.category))}</dd></div>
              <div><dt>Score</dt><dd>${escapeHtml(String(item.score))}</dd></div>
              <div><dt>Monetize</dt><dd>${escapeHtml(item.monetization)}</dd></div>
              <div><dt>Next</dt><dd>${escapeHtml(item.action)}</dd></div>
            </dl>
            <a href="${escapeAttr(item.url)}">Source</a>
          </div>
        </article>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>AI Opportunity Radar Weekly Pro</title>
    <link rel="stylesheet" href="../public/styles.css" />
  </head>
  <body>
    <main class="report-page">
      <section class="report-hero">
        <p class="eyebrow">Paid Deliverable</p>
        <h1>AI Opportunity Radar Weekly Pro</h1>
        <p>${payload.totalCount} source-linked AI business signals with prioritization scores, monetization notes, and first actions.</p>
      </section>
      <section class="trust-band">
        <div>
          <strong>Source-linked research</strong>
          <span>Every item keeps a source link so buyers can verify the original signal.</span>
        </div>
        <div>
          <strong>No outcome guarantee</strong>
          <span>Scores are prioritization signals. This is not financial, legal, investment, or employment advice.</span>
        </div>
      </section>
      <section class="report-list">${rows}</section>
      <section class="final-note">
        Small independent operation. Digital content sales are final and non-refundable after access is delivered. No investment, legal, tax, employment, or income guarantee is provided.
      </section>
    </main>
  </body>
</html>`;
}

function renderSocialPosts(payload) {
  const date = new Date(payload.generatedAt).toLocaleDateString("en-US");
  const top = payload.items.slice(0, 8);
  const list = top.map((item, index) => `${index + 1}. ${item.title}\n   Monetize: ${item.monetization}\n   Next: ${item.action}`).join("\n\n");
  return `# ${date} AI Opportunity Radar Distribution Copy

## X / LinkedIn

I scanned ${payload.items.length} AI business signals today. Here are 8 practical opportunities builders can test quickly:

${list}

The full report includes source links, scores, monetization paths, and first actions.

## Indie Hackers / Reddit

Title: 8 AI business opportunities worth testing this week

I filtered remote jobs, AI tools, open-source projects, and monetization ideas. The goal is not news consumption. The goal is to find low-cost signals that can become a paid report, a template, a service, or a subscription.

${list}

Conclusion: do not start with a heavy product. Start with a $4.99 report, a playbook, or a setup service and validate buyer intent without making income promises.

## Email

Subject: ${payload.items.length} AI business signals from today

I filtered today's AI business signals and pulled out 8 opportunities worth testing. The full report includes source links, scores, monetization paths, and first actions. It is research, not guaranteed income.
`;
}

function renderSponsorKit(payload) {
  const categoryMap = { "远程工作": "Remote Jobs", "AI 工具": "AI Tools", "开源项目": "Open Source", "赚钱案例": "Monetization" };
  const categories = [...new Set(payload.items.map((item) => categoryMap[item.category] || item.category))].join(", ");
  return `# AI Opportunity Radar Sponsor Kit

Updated: ${new Date(payload.generatedAt).toLocaleDateString("en-US")}

## Audience

- Builders, solopreneurs, indie hackers, automation consultants, and AI tool buyers
- Categories: ${categories}
- Current signals: ${payload.items.length}

## Sponsor Slots

- Starter report: $4.99
- Weekly Pro report: $9.99
- Homepage sponsor slot: $49 / 7 days
- Weekly report sponsor mention: $99 / 7 days
- Co-promoted digital product: revenue share

## Best Fit

- AI tools
- Automation services
- Resume and remote-work services
- Indie software products
- SaaS tools for founders

## Contact

Replace the placeholder PayPal payment link and support email in \`public/config.js\` before launch.

## Editorial Standard

- Keep source links visible
- Do not claim guaranteed income
- Do not present scores as investment advice
- Digital content sales are final and non-refundable after access is delivered
- No custom after-sales service is included
`;
}

function categoryLabel(category) {
  const map = { "远程工作": "Remote Jobs", "AI 工具": "AI Tools", "开源项目": "Open Source", "赚钱案例": "Monetization" };
  return map[category] || category;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[char];
  });
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
