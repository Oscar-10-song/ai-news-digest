/**
 * Reddit r/MachineLearning 源
 * 使用 Atom Feed (RSS) 抓取热门讨论帖
 */
import type { NewsItem } from "../types.js";

const SUBREDDIT = "MachineLearning";
const LIMIT = 25;

// 跳过的 bot/管理帖
const SKIP_TITLES = ["Self-Promotion Thread", "Who's Hiring", "Simple Questions", "Discussion Thread"];

export async function fetchRedditML(): Promise<NewsItem[]> {
  try {
    const url = `https://www.reddit.com/r/${SUBREDDIT}/hot.rss?limit=${LIMIT}`;
    console.error(`  [reddit] 抓取 r/${SUBREDDIT} 热门帖...`);

    // 带重试的 fetch（Reddit 偶尔返回 429）
    let res: Response | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; AI-News-Digest/1.0)",
          Accept: "application/atom+xml, application/xml",
        },
      });
      if (res.status !== 429) break;
      console.error(`  [reddit] 429 限流，等待 ${attempt + 1}s 后重试...`);
      await new Promise((r) => setTimeout(r, (attempt + 1) * 1000));
    }

    if (!res || !res.ok) {
      const errBody = res ? await res.text() : "no response";
      throw new Error(`HTTP ${res?.status || "?"}: ${errBody.substring(0, 200)}`);
    }

    const xml = await res.text();
    const items: NewsItem[] = [];

    // 解析 Atom <entry> 元素
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match: RegExpExecArray | null;
    let count = 0;

    while ((match = entryRegex.exec(xml)) !== null && count < LIMIT) {
      const entry = match[1];
      const title = extractTag(entry, "title");
      const author = extractTag(entry, "author");
      const name = extractTag(author, "name") || author;

      // 提取 link href
      const linkMatch = entry.match(/<link\s+href="([^"]+)"/);
      const url = linkMatch ? linkMatch[1] : "";

      if (!title || !url) continue;

      // 跳过 AutoModerator 管理帖
      if (name && (name.includes("AutoModerator") || name.includes("ML_Curator"))) continue;

      // 跳过固定话题帖
      const skipTitle = SKIP_TITLES.some((s) =>
        title.toLowerCase().includes(s.toLowerCase())
      );
      if (skipTitle) continue;

      // 从标题提取 flair tag，如 [R] [P] [N] [D]
      const flairMatch = title.match(/^\[([A-Z]+)\]/);
      const flair = flairMatch ? flairMatch[1] : "";

      // Reddit RSS 不含分数，用默认值 + flair 调整
      // [R]=Research 最高, [P]=Project, [N]=News, [D]=Discussion 最低
      const flairScore: Record<string, number> = { R: 40, P: 35, N: 30, D: 20 };
      const score = flairScore[flair] || 25;

      const parts: string[] = [];
      if (flair) parts.push(`[${flair}]`);
      parts.push(`Reddit ML 热帖`);
      if (name && name !== "/u/[deleted]") parts.push(`by ${name}`);

      items.push({
        source: "reddit",
        title,
        url,
        summary: parts.join(" · "),
        rawScore: score,
      });

      count++;
    }

    console.error(`  [reddit] 获取到 ${items.length} 条热帖`);
    return items;
  } catch (error) {
    console.error("  [reddit] 抓取失败:", error);
    return [];
  }
}

function extractTag(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return m ? decodeEntities(m[1].trim()) : "";
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
}
