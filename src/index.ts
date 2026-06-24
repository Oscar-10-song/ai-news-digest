/**
 * AI 前沿日报 — 主流程
 *
 * 每天早上 8:00 GitHub Actions 触发
 * 并行抓取 6 个源 → 去重 → DeepSeek 筛选 → Gmail 发送
 */
import { fetchArxivPapers } from "./sources/arxiv.js";
import { fetchHackerNews } from "./sources/hackernews.js";
import { fetchGitHubTrending } from "./sources/github.js";
import { fetchNewsApi } from "./sources/newsapi.js";
import { fetchRedditML } from "./sources/reddit.js";
import { fetchHFDailyPapers } from "./sources/huggingface.js";
import { filterWithDeepSeek } from "./filter.js";
import { sendEmail } from "./email.js";
import { loadSeen, deduplicate, saveSeen } from "./dedup.js";
import * as fs from "fs";
import * as path from "path";

// ============================================================
// 环境变量
// ============================================================
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || "";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";
const NEWSAPI_KEY = process.env.NEWSAPI_KEY || "";
const TO_EMAIL = process.env.TO_EMAIL || "ttkx1010@gmail.com";

// ============================================================
// 读取用户偏好配置
// ============================================================
let userPreferences: string | undefined;
try {
  const configPath = path.join(process.cwd(), "config.json");
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    if (config.preferences) {
      userPreferences = config.preferences;
    }
  }
} catch {
  // config.json 不存在或格式错误，忽略
}

async function main() {
  const startTime = Date.now();
  console.error("╔══════════════════════════════════╗");
  console.error("║   🤖 AI 前沿日报 v2             ║");
  console.error("║   " + new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }) + "      ║");
  console.error("╚══════════════════════════════════╝\n");

  if (userPreferences) {
    console.error("📋 用户偏好已加载\n");
  }

  // ============================================================
  // 第一步：并行抓取 6 个源
  // ============================================================
  console.error("━━━ 第一步：抓取新闻源 ━━━");

  const [papers, hfPapers, hnPosts, redditPosts, repos, news] = await Promise.all([
    fetchArxivPapers(),
    fetchHFDailyPapers(),
    fetchHackerNews(),
    fetchRedditML(),
    fetchGitHubTrending(),
    fetchNewsApi(NEWSAPI_KEY),
  ]);

  let allItems = [...papers, ...hfPapers, ...hnPosts, ...redditPosts, ...repos, ...news];
  console.error(
    `\n📊 共抓取 ${allItems.length} 条 (arXiv:${papers.length} HF:${hfPapers.length} HN:${hnPosts.length} Reddit:${redditPosts.length} GitHub:${repos.length} News:${news.length})\n`
  );

  if (allItems.length === 0) {
    console.error("❌ 所有源都没有返回数据，终止。");
    process.exit(1);
  }

  // ============================================================
  // 第一步半：去重
  // ============================================================
  console.error("━━━ 去重：过滤已推送内容 ━━━");

  const seen = loadSeen();
  console.error(`  [dedup] 历史记录: ${Object.keys(seen.titles).length} 条`);

  const beforeCount = allItems.length;
  allItems = deduplicate(allItems, seen);
  console.error(`  [dedup] ${beforeCount} → ${allItems.length} 条 (过滤 ${beforeCount - allItems.length} 条重复)\n`);

  if (allItems.length === 0) {
    console.error("⚠️  所有内容都是重复的（今天没有新东西），终止。");
    process.exit(0);
  }

  // ============================================================
  // 第二步：DeepSeek 智能筛选
  // ============================================================
  console.error("━━━ 第二步：AI 智能筛选 ━━━");

  const result = await filterWithDeepSeek(allItems, DEEPSEEK_API_KEY, userPreferences);

  if (!result) {
    console.error("❌ AI 筛选失败，终止。");
    process.exit(1);
  }

  const { digest, topStory, editorNote } = result;

  // ============================================================
  // 第三步：发送邮件
  // ============================================================
  console.error("\n━━━ 第三步：发送邮件 ━━━");

  const sent = await sendEmail(digest, topStory, editorNote, GMAIL_APP_PASSWORD, TO_EMAIL);

  // ============================================================
  // 第四步：保存去重数据
  // ============================================================
  if (sent) {
    console.error("\n━━━ 第四步：保存去重数据 ━━━");
    // 把今天筛选出的条目（非全部抓取的）存入 seen
    const allCurated = [...digest.papers, ...digest.trending, ...digest.tools, ...digest.news];
    saveSeen(allCurated, seen);
  }

  // ============================================================
  // 完成
  // ============================================================
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  if (sent) {
    console.error(`\n✅ 日报已发送！耗时 ${elapsed}s`);
    console.error(`   收件人: ${TO_EMAIL}`);
    console.error(`   内容: 论文${digest.papers.length} 热帖${digest.trending.length} 工具${digest.tools.length} 新闻${digest.news.length}`);
  } else {
    console.error(`\n⚠️  筛选完成但邮件发送失败，耗时 ${elapsed}s`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("💥 未捕获的错误:", error);
  process.exit(1);
});
