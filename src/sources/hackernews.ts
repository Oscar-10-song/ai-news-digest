/**
 * Hacker News 热帖源
 * 抓取 Top 50，筛选 AI/ML 相关帖子（分数 > 50）
 * API 免费，无需 Key，官方 Firebase API
 */
import type { NewsItem } from "../types.js";

const HN_TOP_STORIES = "https://hacker-news.firebaseio.com/v0/topstories.json";
const HN_ITEM = (id: number) =>
  `https://hacker-news.firebaseio.com/v0/item/${id}.json`;

/** AI 相关的关键词 */
const AI_KEYWORDS = [
  "ai", "artificial intelligence", "llm", "gpt", "claude", "gemini",
  "machine learning", "deep learning", "transformer", "agent",
  "openai", "anthropic", "google deepmind", "deepseek", "mistral",
  "langchain", "vector", "embedding", "rag", "fine-tun",
  "neural", "diffusion", "stable diffusion", "midjourney",
  "mcp", "model context protocol", "a2a", "agent-to-agent",
  "vibe cod", "cursor", "copilot", "autonomous",
  "robot", "reinforcement learning", "rlhf",
];

function isAiRelated(title: string): boolean {
  const lower = title.toLowerCase();
  return AI_KEYWORDS.some((kw) => lower.includes(kw));
}

interface HnItem {
  id: number;
  title?: string;
  url?: string;
  score?: number;
  descendants?: number;
  type?: string;
}

async function fetchItem(id: number): Promise<HnItem | null> {
  try {
    const res = await fetch(HN_ITEM(id));
    if (!res.ok) return null;
    return (await res.json()) as HnItem;
  } catch {
    return null;
  }
}

export async function fetchHackerNews(): Promise<NewsItem[]> {
  try {
    console.error("  [hackernews] 获取 Top 50 热帖...");
    const res = await fetch(HN_TOP_STORIES);
    const ids: number[] = await res.json();

    // 只取前 50 个
    const topIds = ids.slice(0, 50);

    // 并行获取详情（限制并发 10 个一批）
    const items: NewsItem[] = [];
    const batchSize = 10;

    for (let i = 0; i < topIds.length; i += batchSize) {
      const batch = topIds.slice(i, i + batchSize);
      const results = await Promise.all(batch.map(fetchItem));

      for (const item of results) {
        if (!item || !item.title || !isAiRelated(item.title)) continue;

        // 只取热度高的（分数 > 50）
        if ((item.score || 0) < 50) continue;

        items.push({
          source: "hackernews",
          title: item.title,
          url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
          summary: `💬 ${item.descendants || 0} 条讨论 · ⬆ ${item.score || 0} 票`,
          rawScore: item.score || 0,
        });
      }
    }

    // 按分数降序
    items.sort((a, b) => b.rawScore - a.rawScore);
    console.error(`  [hackernews] 筛选出 ${items.length} 条 AI 相关热帖`);
    return items.slice(0, 10);
  } catch (error) {
    console.error("  [hackernews] 抓取失败:", error);
    return [];
  }
}
