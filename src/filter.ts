/**
 * DeepSeek 智能筛选模块
 * 把 4 个源的所有内容喂给 DeepSeek，让它挑出真正前沿的
 */
import type { NewsItem, DailyDigest } from "./types.js";
import OpenAI from "openai";

const SYSTEM_PROMPT = `You are an AI news curator for a daily newsletter called "AI 前沿日报" (AI Frontier Daily).

Your job: Review a list of AI-related items from multiple sources and curate the most important ones.

Rules:
1. Select 5-8 items TOTAL across all categories — quality over quantity
2. Prioritize items that are TRULY cutting-edge: new research, new tools, important announcements, industry shifts
3. Skip: PR fluff, incremental updates, low-quality listicles, marketing posts
4. For each selected item, write a 1-2 sentence summary in Chinese (中文) explaining WHY it matters
5. Categorize each item as: "论文", "热帖", "工具", or "新闻"
6. The final output must be valid JSON

Output format:
{
  "selected": [
    {
      "title": "原始标题",
      "url": "原始链接",
      "category": "论文|热帖|工具|新闻",
      "chineseSummary": "用中文解释为什么这条值得关注（1-2句）",
      "importance": 1-10
    }
  ],
  "topStory": "一句话总结今天最重要的进展",
  "editorNote": "一句话编辑点评"
}`;

function buildUserPrompt(allItems: NewsItem[]): string {
  const grouped: Record<string, string[]> = {
    "📄 论文 (arXiv)": [],
    "🔥 热帖 (Hacker News)": [],
    "🛠 开源 (GitHub)": [],
    "📰 新闻 (NewsAPI)": [],
  };

  for (const item of allItems) {
    const key =
      item.source === "arxiv"
        ? "📄 论文 (arXiv)"
        : item.source === "hackernews"
          ? "🔥 热帖 (Hacker News)"
          : item.source === "github"
            ? "🛠 开源 (GitHub)"
            : "📰 新闻 (NewsAPI)";

    grouped[key].push(
      `[${grouped[key].length + 1}] ${item.title}\n   URL: ${item.url}\n   摘要: ${item.summary.substring(0, 200)}`
    );
  }

  return Object.entries(grouped)
    .map(([label, items]) => `${label}\n${items.join("\n\n")}`)
    .join("\n\n---\n\n");
}

interface CuratedItem {
  title: string;
  url: string;
  category: string;
  chineseSummary: string;
  importance: number;
}

interface CuratedResult {
  selected: CuratedItem[];
  topStory: string;
  editorNote: string;
}

export async function filterWithDeepSeek(
  allItems: NewsItem[],
  apiKey: string
): Promise<{ digest: DailyDigest; topStory: string; editorNote: string } | null> {
  if (!apiKey || apiKey === "sk-xxxxxxxxxxxx") {
    console.error("❌ DeepSeek API Key 未配置");
    return null;
  }

  if (allItems.length === 0) {
    console.error("❌ 没有可筛选的内容");
    return null;
  }

  try {
    console.error(`  [deepseek] 正在筛选 ${allItems.length} 条内容...`);

    const client = new OpenAI({
      apiKey,
      baseURL: "https://api.deepseek.com/v1",
    });

    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(allItems) },
      ],
      temperature: 0.3,
      max_tokens: 4096,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("DeepSeek 返回空内容");
    }

    // 提取 JSON（可能在 ```json ... ``` 代码块中）
    const jsonMatch =
      content.match(/```json\s*([\s\S]*?)\s*```/) ||
      content.match(/```\s*([\s\S]*?)\s*```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;

    let curated: CuratedResult;
    try {
      curated = JSON.parse(jsonStr.trim());
    } catch {
      // 尝试修复截断的 JSON
      const fixed = jsonStr.trim() + '"}]}';
      curated = JSON.parse(fixed);
    }

    const digest: DailyDigest = {
      date: new Date().toISOString().split("T")[0],
      papers: [],
      trending: [],
      tools: [],
      news: [],
    };

    for (const item of curated.selected) {
      const newsItem: NewsItem = {
        source: "arxiv", // placeholder
        title: item.title,
        url: item.url,
        summary: item.chineseSummary,
        rawScore: item.importance,
        category: item.category,
      };

      switch (item.category) {
        case "论文":
          digest.papers.push(newsItem);
          break;
        case "热帖":
          digest.trending.push(newsItem);
          break;
        case "工具":
          digest.tools.push(newsItem);
          break;
        case "新闻":
          digest.news.push(newsItem);
          break;
      }
    }

    console.error(
      `  [deepseek] 筛选完成: ${curated.selected.length} 条 (论文${digest.papers.length} 热帖${digest.trending.length} 工具${digest.tools.length} 新闻${digest.news.length})`
    );

    return {
      digest,
      topStory: curated.topStory,
      editorNote: curated.editorNote,
    };
  } catch (error) {
    console.error("  [deepseek] 筛选失败:", error);
    return null;
  }
}
