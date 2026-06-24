/**
 * HuggingFace Daily Papers 源
 * 获取当天社区评选的热门 AI 论文，附带 GitHub Stars、AI 摘要等
 */
import type { NewsItem } from "../types.js";

export async function fetchHFDailyPapers(): Promise<NewsItem[]> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const url = `https://huggingface.co/api/daily_papers?date=${today}&limit=20`;
    console.error(`  [huggingface] 抓取每日论文 (${today})...`);

    const res = await fetch(url, {
      headers: {
        "User-Agent": "AI-News-Digest/1.0",
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }

    const data = (await res.json()) as Array<{
      title: string;
      paper: {
        id: string;
        title: string;
        summary: string;
        upvotes: number;
        githubRepo: string | null;
        githubStars: number;
        ai_summary: string | null;
        publishedAt: string;
      };
    }>;

    const items: NewsItem[] = data.map((item) => {
      const p = item.paper;
      const parts: string[] = [];

      // 优先用 AI 摘要，其次用论文摘要
      const aiSummary = p.ai_summary || p.summary;
      if (aiSummary) parts.push(aiSummary.substring(0, 200));

      parts.push(`⬆ ${p.upvotes} HF 投票`);
      if (p.githubRepo) {
        parts.push(`⭐ GitHub ${p.githubStars}`);
      }

      return {
        source: "huggingface",
        title: p.title,
        url: `https://huggingface.co/papers/${p.id}`,
        summary: parts.join(" · "),
        rawScore: p.upvotes + (p.githubStars > 100 ? 10 : 0), // 有高星 GitHub 的加权
        category: `HF论文 · ${p.id}`,
      };
    });

    console.error(`  [huggingface] 获取到 ${items.length} 篇论文`);
    return items;
  } catch (error) {
    console.error("  [huggingface] 抓取失败:", error);
    return [];
  }
}
