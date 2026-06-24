/**
 * arXiv 论文源
 * 抓取 cs.AI、cs.CL、cs.LG 三个分类的最新论文
 * API 免费，无需 Key，但有速率限制（1 req / 3 sec）
 */
import type { NewsItem } from "../types.js";

const ARXIV_CATEGORIES = ["cs.AI", "cs.CL", "cs.LG"];

/** 构建 arXiv API 搜索 URL */
function buildArxivUrl(): string {
  // 搜索三个 AI 相关分类，按提交日期排序，取最新 15 篇
  const catQuery = ARXIV_CATEGORIES.map((c) => `cat:${c}`).join("+OR+");
  return `http://export.arxiv.org/api/query?search_query=${catQuery}&sortBy=submittedDate&max_results=15`;
}

/** 解析 arXiv XML 响应 */
function parseArxivXml(xml: string): NewsItem[] {
  const items: NewsItem[] = [];

  // 用正则切割每个 <entry>...</entry>
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];

    const title = extractTag(entry, "title");
    const summary = extractTag(entry, "summary");
    const id = extractTag(entry, "id");
    // arXiv ID 格式：http://arxiv.org/abs/2606.12345
    const paperId = id.split("/abs/").pop() || id;

    // 提取分类
    const categories: string[] = [];
    const catRegex = /term="([^"]+)"/g;
    let catMatch;
    while ((catMatch = catRegex.exec(entry)) !== null) {
      if (ARXIV_CATEGORIES.includes(catMatch[1])) {
        categories.push(catMatch[1]);
      }
    }

    if (title && summary) {
      items.push({
        source: "arxiv",
        title: title.replace(/\n/g, " ").trim(),
        url: `https://arxiv.org/abs/${paperId}`,
        summary: summary.replace(/\n/g, " ").trim().substring(0, 300),
        rawScore: 50, // 所有论文基础分相同，AI 来筛选
        category: categories.join(", "),
      });
    }
  }

  return items;
}

function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const match = regex.exec(xml);
  return match ? match[1].trim() : "";
}

export async function fetchArxivPapers(): Promise<NewsItem[]> {
  try {
    // arXiv 要求礼貌等待 3 秒
    const url = buildArxivUrl();
    console.error(`  [arxiv] 请求: ${url}`);

    const response = await fetch(url, {
      headers: { "User-Agent": "AI-News-Digest/1.0" },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const xml = await response.text();
    const items = parseArxivXml(xml);
    console.error(`  [arxiv] 获取到 ${items.length} 篇论文`);
    return items;
  } catch (error) {
    console.error(`  [arxiv] 抓取失败:`, error);
    return [];
  }
}
