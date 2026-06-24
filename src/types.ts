/** 单条新闻/资讯 */
export interface NewsItem {
  source: "arxiv" | "hackernews" | "github" | "newsapi";
  title: string;
  url: string;
  summary: string;
  /** 原始热度分（用于排序参考） */
  rawScore: number;
  /** AI 筛选后的分类 */
  category?: string;
}

/** 最终日报 */
export interface DailyDigest {
  date: string;
  papers: NewsItem[];       // 论文
  trending: NewsItem[];      // 热帖/讨论
  tools: NewsItem[];         // 开源工具
  news: NewsItem[];          // 行业新闻
}
