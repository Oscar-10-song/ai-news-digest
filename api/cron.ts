/**
 * Vercel Cron Job → 每天北京时间 8:00 触发 GitHub Actions 工作流
 *
 * GitHub Actions 的 schedule 对低活动量仓库不可靠，
 * 用 Vercel Cron（免费）来保证准时触发。
 */

const GITHUB_TOKEN = process.env.GH_TOKEN || "";

export default async function handler(_req: any, res: any) {
  console.log("[cron] 触发每日日报工作流...");

  try {
    const resp = await fetch(
      "https://api.github.com/repos/Oscar-10-song/ai-news-digest/actions/workflows/301234705/dispatches",
      {
        method: "POST",
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "User-Agent": "vercel-cron",
        },
        body: JSON.stringify({ ref: "main" }),
      }
    );

    if (resp.ok) {
      console.log("[cron] ✅ 工作流已触发");
      return res.status(200).json({ status: "triggered" });
    } else {
      const text = await resp.text();
      console.error("[cron] 触发失败:", resp.status, text);
      return res.status(500).json({ error: "failed to trigger", detail: text });
    }
  } catch (error: any) {
    console.error("[cron] 错误:", error.message);
    return res.status(500).json({ error: error.message });
  }
}
