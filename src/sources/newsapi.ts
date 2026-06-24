/**
 * NewsAPI 新闻源（可选）
 * 需要 API Key，免费额度 100 次/天
 */
import type { NewsItem } from "../types.js";

export async function fetchNewsApi(apiKey?: string): Promise<NewsItem[]> {
  if (!apiKey || apiKey === "xxxxxxxxxxxx") {
    console.error("  [newsapi] 未配置 API Key，跳过...");
    return [];
  }

  try {
    // 搜索过去 24 小时的 AI 新闻
    const today = new Date().toISOString().split("T")[0];
    const query = encodeURIComponent(
      'artificial intelligence OR large language model OR AI agent"'
    );
    const url = `https://newsapi.org/v2/everything?q=${query}&from=${today}&sortBy=popularity&language=en&pageSize=15&apiKey=${apiKey}`;

    console.error("  [newsapi] 搜索最新 AI 新闻...");
    const res = await fetch(url);

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HTTP ${res.status}: ${body}`);
    }

    const data = (await res.json()) as {
      articles: Array<{
        title: string;
        url: string;
        description: string;
        source: { name: string };
        publishedAt: string;
      }>;
    };

    const items: NewsItem[] = data.articles.map((a) => ({
      source: "newsapi",
      title: a.title,
      url: a.url,
      summary: a.description || "",
      rawScore: 30,
      category: a.source.name,
    }));

    console.error(`  [newsapi] 获取到 ${items.length} 条新闻`);
    return items;
  } catch (error) {
    console.error("  [newsapi] 抓取失败:", error);
    return [];
  }
}
