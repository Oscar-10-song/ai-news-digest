/**
 * 快速测试脚本：只抓取源，不筛选不发送
 */
import { fetchArxivPapers } from "./sources/arxiv.js";
import { fetchHackerNews } from "./sources/hackernews.js";
import { fetchGitHubTrending } from "./sources/github.js";
import { fetchNewsApi } from "./sources/newsapi.js";

async function main() {
  console.error("🧪 测试新闻源抓取...\n");

  const [papers, hn, repos, news] = await Promise.all([
    fetchArxivPapers(),
    fetchHackerNews(),
    fetchGitHubTrending(),
    fetchNewsApi("placeholder"),
  ]);

  console.error("\n" + "=".repeat(50));
  console.error(`📊 结果汇总:`);
  console.error(`  arXiv 论文:   ${papers.length} 篇`);
  console.error(`  HN 热帖:      ${hn.length} 条`);
  console.error(`  GitHub 仓库:  ${repos.length} 个`);
  console.error(`  NewsAPI 新闻: ${news.length} 条`);
  console.error(`  总计:         ${papers.length + hn.length + repos.length + news.length} 条`);

  // 打印前几条标题
  console.error("\n📄 arXiv 前 3 篇:");
  papers.slice(0, 3).forEach((p) => console.error(`  - ${p.title.substring(0, 80)}`));

  console.error("\n🔥 HN 前 3 条:");
  hn.slice(0, 3).forEach((h) => console.error(`  - ${h.title.substring(0, 80)}`));

  console.error("\n🛠 GitHub 前 3 个:");
  repos.slice(0, 3).forEach((r) => console.error(`  - ${r.title.substring(0, 80)}`));
}

main().catch(console.error);
