/**
 * 去重模块
 * 记录最近 7 天已推送的标题和 URL，避免重复推送
 * 数据存储在 data/seen.json，由 GitHub Actions 自动提交
 */
import type { NewsItem } from "./types.js";
import * as fs from "fs";
import * as path from "path";

const SEEN_FILE = path.join(process.cwd(), "data", "seen.json");
const MAX_DAYS = 7;

interface SeenData {
  titles: Record<string, string>; // { "title text": "2026-06-24" }
  urls: Record<string, string>;   // { "url": "2026-06-24" }
}

/** 加载已看到的数据，清理超过 7 天的记录 */
export function loadSeen(): SeenData {
  try {
    if (!fs.existsSync(SEEN_FILE)) {
      return { titles: {}, urls: {} };
    }
    const raw = fs.readFileSync(SEEN_FILE, "utf-8");
    const data: SeenData = JSON.parse(raw);

    // 清理 7 天前的记录
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - MAX_DAYS);
    const cutoffStr = cutoff.toISOString().split("T")[0];

    const clean = (map: Record<string, string>) => {
      const cleaned: Record<string, string> = {};
      for (const [key, date] of Object.entries(map)) {
        if (date >= cutoffStr) cleaned[key] = date;
      }
      return cleaned;
    };

    return { titles: clean(data.titles), urls: clean(data.urls) };
  } catch {
    return { titles: {}, urls: {} };
  }
}

/** 去重：过滤掉已见过的条目 */
export function deduplicate(items: NewsItem[], seen: SeenData): NewsItem[] {
  return items.filter((item) => {
    const titleKey = normalize(item.title);
    const urlKey = item.url;

    if (seen.titles[titleKey] || seen.urls[urlKey]) {
      console.error(`  [dedup] 跳过重复: ${item.title.substring(0, 60)}`);
      return false;
    }
    return true;
  });
}

/** 将新条目标记为已见 */
export function saveSeen(items: NewsItem[], seen: SeenData): void {
  const today = new Date().toISOString().split("T")[0];

  for (const item of items) {
    const titleKey = normalize(item.title);
    seen.titles[titleKey] = today;
    seen.urls[item.url] = today;
  }

  // 确保 data 目录存在
  const dir = path.dirname(SEEN_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(SEEN_FILE, JSON.stringify(seen, null, 2), "utf-8");
  console.error(`  [dedup] 已记录 ${items.length} 条，共 ${Object.keys(seen.titles).length} 条历史`);
}

/** 归一化标题，用于比较 */
function normalize(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w一-鿿]/g, "")
    .trim()
    .substring(0, 80);
}
