/**
 * Gumroad Webhook → 自动加入 subscribers.json
 *
 * 买家付款后 Gumroad 会 POST 到这个地址，自动把邮箱写进 subscribers.json
 * 第二天 GitHub Actions 跑日报时就会把新买家加入推送列表
 */

const GITHUB_TOKEN = process.env.GH_TOKEN || "";
const REPO_OWNER = "Oscar-10-song";
const REPO_NAME = "ai-news-digest";
const FILE_PATH = "subscribers.json";

// ============================================================
// 调用 GitHub API 读写 subscribers.json
// ============================================================
async function getSubscribers(): Promise<{ emails: string[]; sha: string }> {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "ai-scout-webhook",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub GET failed (${res.status}): ${text}`);
  }

  const data: any = await res.json();
  const content = Buffer.from(data.content, "base64").toString("utf-8");
  const emails: string[] = JSON.parse(content);
  return { emails, sha: data.sha };
}

async function commitSubscribers(emails: string[], sha: string, email: string, event: string) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
  const content = Buffer.from(JSON.stringify(emails, null, 2) + "\n").toString("base64");

  const action = event === "refund" ? "remove" : "add";
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      "User-Agent": "ai-scout-webhook",
    },
    body: JSON.stringify({
      message: `webhook: ${action} subscriber ${email}`,
      content,
      sha,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub PUT failed (${res.status}): ${text}`);
  }
}

// ============================================================
// Vercel Serverless 入口
// ============================================================
export default async function handler(req: any, res: any) {
  // ── GET：Gumroad Webhook 验证（回显 license_key）──
  if (req.method === "GET") {
    const licenseKey = req.query?.license_key;
    if (licenseKey) {
      console.log("[webhook] Gumroad 验证请求，回显 license_key");
      return res.status(200).send(String(licenseKey));
    }
    return res.status(200).send("AI Scout webhook is running.");
  }

  // ── POST：Gumroad 事件 ──
  if (req.method === "POST") {
    const body = req.body || {};
    const buyerEmail = body.email;
    // Gumroad 事件类型：sale（购买）/ refund（退款）/ chargeback（拒付）
    const event = body.event || body.sale_event || "";

    if (!buyerEmail || !buyerEmail.includes("@")) {
      console.error("[webhook] 请求中没有有效 email", JSON.stringify(body));
      return res.status(400).json({ error: "no valid email in request" });
    }

    console.log(`[webhook] 事件: ${event || "sale"}  买家: ${buyerEmail}  商品: ${body.product_name || "unknown"}`);

    try {
      const { emails, sha } = await getSubscribers();

      // ── 退款 / 拒付：移除订阅 ──
      if (event === "refund" || event === "cancelled" || event === "chargeback") {
        if (!emails.includes(buyerEmail)) {
          console.log(`[webhook] ${buyerEmail} 不在订阅列表中，无需移除`);
          return res.status(200).json({ status: "not_found", email: buyerEmail });
        }
        const filtered = emails.filter((e) => e !== buyerEmail);
        await commitSubscribers(filtered, sha, buyerEmail, "refund");
        console.log(`[webhook] 🗑️ 已移除 ${buyerEmail}（${event}）`);
        return res.status(200).json({ status: "removed", email: buyerEmail, reason: event });
      }

      // ── 购买：添加订阅 ──
      if (emails.includes(buyerEmail)) {
        console.log(`[webhook] ${buyerEmail} 已在订阅列表中，跳过`);
        return res.status(200).json({ status: "duplicate", email: buyerEmail });
      }

      emails.push(buyerEmail);
      await commitSubscribers(emails, sha, buyerEmail, "sale");

      console.log(`[webhook] ✅ 已添加 ${buyerEmail}`);
      return res.status(200).json({ status: "added", email: buyerEmail });
    } catch (error: any) {
      console.error("[webhook] 处理失败:", error.message || error);
      return res.status(500).json({ error: "internal error", detail: error.message });
    }
  }

  // ── 其他方法 ──
  return res.status(405).json({ error: "method not allowed" });
}
