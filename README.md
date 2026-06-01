# AI 出海机会雷达

一个零成本启动的信息项目：自动抓取公开来源，整理成中文机会页，用来验证流量、订阅和低价资料包。

## 本地运行

```bash
npm run generate
npm run serve
```

打开 `http://localhost:4173`。

## 上线方式

最省事的做法是把这个目录推到 GitHub 公开仓库，然后用 GitHub Pages 或 Cloudflare Pages 托管静态页面。

发布目录选择仓库根目录即可，首页在 `index.html`，数据在 `data/opportunities.json`。

## 自动更新

`.github/workflows/daily.yml` 会每天运行一次 `npm run generate`，抓取公开来源并提交新的 `data/opportunities.json`。

每天会自动生成：

- `data/opportunities.json`：机会数据库
- `public/report.html`：可售报告样张
- `data/social-posts.md`：小红书、即刻、知乎、公众号、私域群分发文案
- `data/sponsor-kit.md`：赞助位报价页
- `deliverables/weekly-pro-report.html`：本地完整付费报告，不上传到公网
- `deliverables/weekly-pro-data.json`：本地完整付费数据，不上传到公网

公开网站只展示少量样例。完整数据和完整报告在 `deliverables/`，该目录已加入 `.gitignore`，不会发布到 GitHub Pages。

当前数据源：

- Hacker News：AI 工具信号
- Remote OK：远程岗位
- GitHub Search：AI 自动化开源项目
- 内置种子机会：避免外部抓取失败时页面空白

## PayPal 收款入口

现在默认面向海外英文用户售卖，采用低价分层，优先降低投诉风险。

PayPal 审核完成后，在 PayPal Business 后台创建 3 个 Payment Link：

1. Starter
   - Product name: `AI Opportunity Radar Starter Report`
   - Price: `$4.99`
   - Currency: `USD`
   - Description: `A sample issue with curated AI business signals, source links, and first actions.`

2. Weekly Pro
   - Product name: `AI Opportunity Radar Weekly Pro`
   - Price: `$9.99`
   - Currency: `USD`
   - Description: `A weekly curated report of AI tools, remote jobs, open-source projects, and monetization ideas for builders.`

3. Sponsor
   - Product name: `AI Opportunity Radar Sponsor Slot`
   - Price: `$49`
   - Currency: `USD`
   - Description: `One weekly sponsor mention for a relevant AI tool, automation service, or founder product.`

创建后，把 `public/config.js` 里的 3 个链接分别替换：

- `starterCheckoutUrl`
- `proCheckoutUrl`
- `sponsorCheckoutUrl`

第一阶段只验证一个产品：

- Name: `AI Opportunity Radar Starter Report`
- Price: `$4.99`
- Delivery: `public/report.html` 或 PDF
- Goal: 先拿到 3 个付费或 20 个明确想要的人

当前 PayPal Payment Link 只负责收款，不会自动发货。收到 PayPal 付款通知后，把 `deliverables/weekly-pro-report.html` 导出或发送给买家。后续如果要全自动交付，需要接入 Lemon Squeezy、Gumroad、Payhip、Stripe Payment Links + 自动邮件，或自己做后端 webhook。

## PDF 交付物

生成 PDF：

```bash
npm run pdfs
```

会生成：

- `deliverables/starter-report.pdf`：`$4.99` Starter
- `deliverables/weekly-pro-report.pdf`：`$9.99` Weekly Pro
- `deliverables/sponsor-kit.pdf`：`$49` Sponsor

这些文件都在 `deliverables/`，不会发布到公网。

## 邮件发货

预览发货邮件：

```bash
/Users/yaosiyuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 scripts/send_delivery.py --tier starter --to buyer@example.com --transaction PAYPAL-ID --dry-run
```

真实发送需要配置专用发货邮箱的 SMTP 环境变量：

```bash
export DELIVERY_FROM_EMAIL="AI Opportunity Radar <your-delivery-email@example.com>"
export DELIVERY_SMTP_HOST="smtp.example.com"
export DELIVERY_SMTP_PORT="587"
export DELIVERY_SMTP_USER="your-delivery-email@example.com"
export DELIVERY_SMTP_PASS="app-password-or-smtp-token"
```

发送：

```bash
/Users/yaosiyuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 scripts/send_delivery.py --tier pro --to buyer@example.com --transaction PAYPAL-ID
```

不要使用主邮箱密码。只使用专门发货邮箱的 app password 或 SMTP token。

第二阶段卖赞助：

- Homepage sponsor slot: `$49 / 7 days`
- Weekly report sponsor mention: `$99 / 7 days`
- 资料包联合推广：按成交分成

## 销售原则

- 只卖整理、筛选、来源链接和执行建议
- 不承诺买家一定赚钱
- 不做投资、法律、税务或就业保证
- 每条机会保留来源链接，允许买家自行验证
- 数字内容交付访问后概不退款
- 不包含定制售后服务
- 页面底部必须写清楚：小本经营，数字内容交付后概不退款；不提供投资、法律、税务、就业或收益保证

## 全自动运行边界

系统可以自动抓取、筛选、生成报告、生成分发文案、更新静态页面。

系统不能在没有你的收款账号和发布账号授权时自动收钱或自动发到第三方平台。上线前至少需要把邮箱、微信收款页、表单或店铺链接替换到页面里。
