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
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
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

// ============================================================
// 读取订阅者列表
// ============================================================
function loadSubscribers(): string[] {
  try {
    const subsPath = path.join(process.cwd(), "subscribers.json");
    if (fs.existsSync(subsPath)) {
      const list = JSON.parse(fs.readFileSync(subsPath, "utf-8"));
      if (Array.isArray(list) && list.length > 0) {
        // 去重 + 过滤空值
        return [...new Set(list.filter((e: unknown) => typeof e === "string" && e.includes("@") && e.trim() !== ""))];
      }
    }
  } catch {
    console.error("  [subscribers] 读取失败，使用默认收件人");
  }
  return [];
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

  // 确定收件人列表：订阅者优先，否则回退到 TO_EMAIL
  const subscribers = loadSubscribers();
  let recipients: string[];
  if (subscribers.length > 0) {
    recipients = subscribers;
    console.error(`  📬 订阅者模式：${recipients.length} 个收件人`);
  } else {
    recipients = [TO_EMAIL];
    console.error(`  📬 单用户模式：${TO_EMAIL}`);
  }

  let successCount = 0;
  let failCount = 0;
  for (const to of recipients) {
    console.error(`  → 发送到 ${to} ...`);
    const ok = await sendEmail(digest, topStory, editorNote, RESEND_API_KEY, to);
    if (ok) {
      successCount++;
    } else {
      failCount++;
    }
    // 多个收件人时加一点间隔，避免触发速率限制
    if (recipients.length > 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  const sent = successCount > 0;

  // ============================================================
  // 第四步：保存去重数据
  // ============================================================
  if (sent) {
    console.error("\n━━━ 第四步：保存去重数据 ━━━");
    const allCurated = [...digest.papers, ...digest.trending, ...digest.tools, ...digest.news];
    saveSeen(allCurated, seen);
  }

  // ============================================================
  // 完成
  // ============================================================
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  if (sent) {
    console.error(`\n✅ 日报已发送！耗时 ${elapsed}s`);
    console.error(`   成功: ${successCount} 人, 失败: ${failCount} 人`);
    console.error(`   内容: 论文${digest.papers.length} 热帖${digest.trending.length} 工具${digest.tools.length} 新闻${digest.news.length}`);
    if (failCount > 0) {
      console.error(`   ⚠️ 有 ${failCount} 个收件人发送失败，请检查日志`);
    }
  } else {
    console.error(`\n⚠️  筛选完成但邮件发送失败 (${failCount}/${recipients.length})，耗时 ${elapsed}s`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("💥 未捕获的错误:", error);
  process.exit(1);
});
