/**
 * 快速测试脚本：只抓取源，不筛选不发送
 */
import { fetchArxivPapers } from "./sources/arxiv.js";
import { fetchHackerNews } from "./sources/hackernews.js";
import { fetchGitHubTrending } from "./sources/github.js";
import { fetchNewsApi } from "./sources/newsapi.js";
import { fetchRedditML } from "./sources/reddit.js";
import { fetchHFDailyPapers } from "./sources/huggingface.js";

async function main() {
  console.error("🧪 测试新闻源抓取...\n");

  const [papers, hfPapers, hn, reddit, repos, news] = await Promise.all([
    fetchArxivPapers(),
    fetchHFDailyPapers(),
    fetchHackerNews(),
    fetchRedditML(),
    fetchGitHubTrending(),
    fetchNewsApi("placeholder"),
  ]);

  console.error("\n" + "=".repeat(50));
  console.error(`📊 结果汇总:`);
  console.error(`  arXiv 论文:     ${papers.length} 篇`);
  console.error(`  HuggingFace:    ${hfPapers.length} 篇`);
  console.error(`  HN 热帖:        ${hn.length} 条`);
  console.error(`  Reddit ML:      ${reddit.length} 条`);
  console.error(`  GitHub 仓库:    ${repos.length} 个`);
  console.error(`  NewsAPI 新闻:   ${news.length} 条`);
  console.error(`  总计:           ${papers.length + hfPapers.length + hn.length + reddit.length + repos.length + news.length} 条`);

  const show = (label: string, items: { title: string }[], count = 3) => {
    if (items.length > 0) {
      console.error(`\n${label}:`);
      items.slice(0, count).forEach((i) => console.error(`  - ${i.title.substring(0, 80)}`));
    }
  };

  show("📄 arXiv", papers);
  show("📄 HuggingFace", hfPapers);
  show("🔥 HN", hn);
  show("💬 Reddit", reddit);
  show("🛠 GitHub", repos);
  show("📰 NewsAPI", news);
}

main().catch(console.error);
