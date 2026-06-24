/**
 * GitHub Trending 源
 * 搜索最近一周 AI/ML 相关仓库，按 Star 排序
 */
import type { NewsItem } from "../types.js";

/** 计算 7 天前的日期字符串 */
function sevenDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().split("T")[0];
}

export async function fetchGitHubTrending(): Promise<NewsItem[]> {
  try {
    const since = sevenDaysAgo();
    // 方案 A：关键词搜索，最近一周创建，按 Star 排序
    // 关键词覆盖 AI/LLM/Agent 等热门方向
    let url = `https://api.github.com/search/repositories?q=ai+OR+llm+OR+agent+OR+machine-learning+created:>${since}&sort=stars&order=desc&per_page=15`;

    // GitHub API 限制：未认证请求 60次/小时，已认证 5000次/小时
    // 如果有 GH_TOKEN 环境变量就用它（避免 GITHUB_ 保留前缀）
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "AI-News-Digest/1.0",
    };
    if (process.env.GH_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GH_TOKEN}`;
    }

    console.error(`  [github] 搜索最近一周 AI 仓库...`);
    const res = await fetch(url, { headers });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }

    const data = (await res.json()) as {
      items: Array<{
        full_name: string;
        html_url: string;
        description: string;
        stargazers_count: number;
        language: string;
        topics: string[];
      }>;
    };

    const items: NewsItem[] = data.items.map((repo) => ({
      source: "github",
      title: `${repo.full_name} ⭐ ${repo.stargazers_count}`,
      url: repo.html_url,
      summary: repo.description || repo.topics.join(", "),
      rawScore: repo.stargazers_count,
    }));

    console.error(`  [github] 获取到 ${items.length} 个仓库`);
    return items;
  } catch (error) {
    console.error("  [github] 抓取失败:", error);
    return [];
  }
}
