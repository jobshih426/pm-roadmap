// 職缺清單。**這是 CI 唯一會寫入的檔案**——scripts/check-jobs.mjs 每週一就地改
// health / closedAt / checkedAt / retiredTotal，判斷欄位（match / why / tier /
// pdmExposure）一個字都不動。
//
// ⚠️ 動這個檔之前先 `git pull --rebase`。本機與 CI 都會寫它，這是唯一的併發寫入點。
// ⚠️ check-jobs.mjs 用 regex 解析（HEADER_RE），改格式前先跑 --dry-run。
// ⚠️ 只被 index.html 載入。傳統 <script src>，不可改成 type="module"。

// Maintained by scripts/check-jobs.mjs (weekly, via .github/workflows/check-jobs.yml).
// health: "open" = HTTP 200 | "closed" = HTTP 404/410 | "unknown" = could not verify
// A blocked request (403 etc.) is NOT evidence a job is closed — see the script.
// closedAt on a job is the removal timer: it is retired on the next run 7+ days later.
const JOBS_META = {
  checkedAt: "2026-08-31",
  checkMethod: "HEAD 每個職缺頁，依 HTTP 狀態碼判定",
  trackingSince: "2026-06-30",  // 統計窗口起點：職缺清單建立日
  retiredTotal: 11                // 累計因下架而從清單移除的筆數
};

const JOBS_DATA = [
  // tier: "top" = 主推投遞 | "track" = 持續觀察 | "later" = 暫緩
  {
    rank: 1, tier: "top", health: "open",
    title: "AI Project Manager (PM)",
    company: "MaiAgent 思邁智能",
    pdmExposure: "high",
    type: "PJM + PDM",
    salary: "75–100 萬/年",
    exp: "3 年以上",
    match: 88,
    tags: ["Scrum 必要", "AI/技術背景", "新創", "SaaS"],
    why: "Scrum 必要條件（你有）、工程背景加分（你有）。薪資最高，背景命中率最高。",
    url: "https://www.cake.me/companies/MaiAgent/jobs/ai-project-manager-pm"
  },
  {
    rank: 2, tier: "top", health: "open",
    title: "Project Manager（Shopify 系統整合）",
    company: "Akohub",
    pdmExposure: "mid",
    type: "PJM",
    salary: "38–65k/月",
    exp: "1 年以上",
    match: 85,
    tags: ["系統整合", "電商", "技術背景", "1yr OK"],
    why: "需求翻技術規格＋確認開發可行性 = 你天天在做的事。年資門檻最低，最快拿到 PM title。",
    url: "https://www.cake.me/companies/akohub/jobs/project-manager-shopify-store-system-integration"
  },
  {
    rank: 3, tier: "top", health: "open",
    title: "產品經理 PM（Tasker 外包網）",
    company: "addcn",
    pdmExposure: "high",
    type: "PDM",
    salary: "60–85 萬/年",
    exp: "2 年以上",
    match: 72,
    tags: ["PDM", "網站UX", "數據分析", "物流加分"],
    why: "需網站開發流程 + UI/UX 背景（你有），補好 GA4 後即可投。PDM 列表裡門檻最符合你的。",
    url: "https://www.cake.me/companies/addcn/jobs/tasker-outsourcing-network-product-manager-pm"
  },
  {
    rank: 4, tier: "top", health: "closed", closedAt: "2026-08-31",
    title: "Junior Project Manager（RPA 產品）",
    company: "IsCoolLab",
    pdmExposure: "low",
    type: "PJM",
    salary: "面議（估 45–60k）",
    exp: "2 年以上",
    match: 78,
    tags: ["Junior OK", "IT背景必要", "RPA", "技術PM"],
    why: "IT 背景必要條件（你有），明確標 Junior。RPA 需要懂自動化邏輯，後端經驗正好。",
    url: "https://www.cake.me/companies/iscoollab/jobs/junior-project-manager-502"
  },
  {
    rank: 5, tier: "track", health: "open",
    title: "Associate Product Manager",
    company: "GoFreight",
    type: "APM",
    salary: "面議",
    exp: "2 年以上",
    match: 73,
    tags: ["APM 入門", "物流SaaS", "英文環境", "垂直SaaS"],
    why: "APM 職級是很好的轉職跳板。物流 SaaS 技術背景吃重，你的工程底子是加分。英文環境需準備。",
    url: "https://www.cake.me/companies/GoFreight/jobs/associate-product-manager-ccf"
  },
  {
    rank: 6, tier: "track", health: "open",
    title: "Product Manager（電商 SaaS）",
    company: "Shopline",
    type: "PDM",
    salary: "面議",
    exp: "3 年以上",
    match: 70,
    tags: ["電商SaaS", "英文JD", "3yr要求", "知名度高"],
    why: "台灣知名電商 SaaS，產品 scope 大。3yr 要求稍高，但若 portfolio 強可以試。英文工作環境。",
    url: "https://www.cake.me/companies/shopline/jobs/tpd0303product-manager"
  },
  {
    rank: 7, tier: "track", health: "open",
    title: "Amazon Project Manager（電商代操）",
    company: "HourLoop",
    type: "PJM",
    salary: "45–50k/月",
    exp: "1 年以上",
    match: 65,
    tags: ["1yr OK", "培訓制", "亞馬遜電商", "入門軌"],
    why: "有完整 2 個月入職訓練，Project Assistant 起步。電商領域不是你的強項，但門檻低、薪資尚可。",
    url: "https://www.cake.me/companies/hour-loop/jobs/amazon-amazon-project-manager"
  },
  {
    rank: 8, tier: "later", health: "open",
    title: "Project Manager（政府標案）",
    company: "SYSTEX 精誠資訊",
    type: "PJM",
    salary: "面議",
    exp: "面議",
    match: 50,
    tags: ["政府標案", "大型企業", "傳統IT"],
    why: "政府標案 PM 流程很不一樣，學到的 skill 轉移性低。暫緩，除非你明確想走政府專案路線。",
    url: "https://www.cake.me/companies/systex/jobs/pjm-project-manager-government-projects-v30h"
  },
  {
    rank: 9, tier: "later", health: "open",
    title: "Business Analyst",
    company: "雲策數據",
    type: "BA",
    salary: "面議",
    exp: "面議",
    match: 60,
    tags: ["BA不是PM", "數據分析", "可作橋接"],
    why: "BA 和 PM 職責不同，但若 GA4/SQL 先補好，BA 可作為過渡橋接再往 PM 跳。",
    url: "https://www.cake.me/companies/104-company-1a2x6blq4a/jobs/business-analyst1"
  },
  {
    rank: 10, tier: "later", health: "open",
    title: "Brand Product Manager（GTM）",
    company: "WitsPer 智選家",
    type: "PDM + 行銷",
    salary: "面議",
    exp: "面議",
    match: 55,
    tags: ["品牌PM", "GTM重", "行銷偏向"],
    why: "GTM / 行銷策略比重高，技術 PM 強項用不上。等行銷技能補強後再考慮。",
    url: "https://www.cake.me/companies/witsper/jobs/bm-brand-product-manager-gtm-strategy"
  },
  {
    rank: 11, tier: "later", health: "open",
    title: "Project Manager（健康領域）",
    company: "原氣",
    type: "PJM",
    salary: "面議",
    exp: "面議",
    match: 60,
    tags: ["健康科技", "小公司", "領域待確認"],
    why: "健康領域待確認，需看更多 JD 細節後評估。",
    url: "https://www.cake.me/companies/drbreaths/jobs/project-manage"
  },
  {
    rank: 12, tier: "later", health: "unknown",
    title: "PM（台中）",
    company: "庠菻",
    type: "PJM",
    salary: "面議",
    exp: "面議",
    match: 50,
    tags: ["台中", "地點限制"],
    why: "台中職缺，地點不符需求則排除。",
    url: "https://www.104.com.tw/job/91f9b?jobsource=joblist_search"
  },
];
