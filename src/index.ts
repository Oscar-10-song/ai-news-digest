/**
 * AI 前沿日报 — 主流程
 *
 * 每天早上 8:00 GitHub Actions 触发
 * 并行抓取 4 个源 → DeepSeek 筛选 → 格式化 → Resend 发送
 */
import { fetchArxivPapers } from "./sources/arxiv.js";
import { fetchHackerNews } from "./sources/hackernews.js";
import { fetchGitHubTrending } from "./sources/github.js";
import { fetchNewsApi } from "./sources/newsapi.js";
import { filterWithDeepSeek } from "./filter.js";
import { sendEmail } from "./email.js";

// ============================================================
// 环境变量
// ============================================================
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";
const NEWSAPI_KEY = process.env.NEWSAPI_KEY || "";
const TO_EMAIL = process.env.TO_EMAIL || "ttkx1010@gmail.com";

async function main() {
  const startTime = Date.now();
  console.error("╔══════════════════════════════════╗");
  console.error("║   🤖 AI 前沿日报               ║");
  console.error("║   " + new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }) + "      ║");
  console.error("╚══════════════════════════════════╝\n");

  // ============================================================
  // 第一步：并行抓取 4 个源
  // ============================================================
  console.error("━━━ 第一步：抓取新闻源 ━━━");

  const [papers, hnPosts, repos, news] = await Promise.all([
    fetchArxivPapers(),
    fetchHackerNews(),
    fetchGitHubTrending(),
    fetchNewsApi(NEWSAPI_KEY),
  ]);

  const allItems = [...papers, ...hnPosts, ...repos, ...news];
  console.error(`\n📊 共抓取 ${allItems.length} 条原始内容\n`);

  if (allItems.length === 0) {
    console.error("❌ 所有源都没有返回数据，终止。");
    process.exit(1);
  }

  // ============================================================
  // 第二步：DeepSeek 智能筛选
  // ============================================================
  console.error("━━━ 第二步：AI 智能筛选 ━━━");

  const result = await filterWithDeepSeek(allItems, DEEPSEEK_API_KEY);

  if (!result) {
    console.error("❌ AI 筛选失败，终止。");
    process.exit(1);
  }

  const { digest, topStory, editorNote } = result;

  // ============================================================
  // 第三步：发送邮件
  // ============================================================
  console.error("\n━━━ 第三步：发送邮件 ━━━");

  const sent = await sendEmail(digest, topStory, editorNote, RESEND_API_KEY, TO_EMAIL);

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
