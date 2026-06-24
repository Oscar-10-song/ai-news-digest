/**
 * Gmail SMTP 邮件发送模块
 * 使用 Gmail App Password，从 ttkx1010@gmail.com 发信
 */
import nodemailer from "nodemailer";
import type { DailyDigest } from "./types.js";

function buildHtml(digest: DailyDigest, topStory: string, editorNote: string): string {
  const section = (
    icon: string,
    title: string,
    items: { title: string; url: string; summary: string }[]
  ): string => {
    if (items.length === 0) return "";
    const rows = items
      .map(
        (item) =>
          `<tr>
            <td style="padding:12px 0;border-bottom:1px solid #eee">
              <a href="${item.url}" style="color:#2563eb;font-weight:600;text-decoration:none;font-size:15px">${item.title}</a>
              <p style="color:#666;margin:4px 0 0;font-size:13px;line-height:1.5">${item.summary}</p>
            </td>
          </tr>`
      )
      .join("");
    return `
      <h2 style="color:#1a1a2e;margin:24px 0 12px;font-size:18px;border-left:4px solid #2563eb;padding-left:10px">${icon} ${title}</h2>
      <table style="width:100%;border-collapse:collapse">${rows}</table>
    `;
  };

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:640px;margin:0 auto;padding:20px;background:#f8f9fa">
  <div style="background:#fff;border-radius:12px;padding:30px;box-shadow:0 2px 8px rgba(0,0,0,.06)">
    <div style="text-align:center;padding-bottom:20px;border-bottom:2px solid #2563eb">
      <h1 style="color:#1a1a2e;margin:0;font-size:24px">🤖 AI 前沿日报</h1>
      <p style="color:#999;margin:6px 0 0;font-size:13px">${digest.date} · 由 AI 自动生成 · 每日精选 5-8 条</p>
    </div>
    <div style="background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;border-radius:8px;padding:16px 20px;margin-top:20px">
      <p style="margin:0;font-size:13px;opacity:.8">📌 今日头条</p>
      <p style="margin:6px 0 0;font-size:15px;font-weight:500;line-height:1.5">${topStory}</p>
    </div>
    <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:12px 16px;margin-top:8px">
      <p style="margin:0;font-size:13px;color:#92400e">✏️ ${editorNote}</p>
    </div>
    ${section("📄", "前沿论文", digest.papers)}
    ${section("🔥", "技术热帖", digest.trending)}
    ${section("🛠", "开源工具", digest.tools)}
    ${section("📰", "行业新闻", digest.news)}
    <div style="margin-top:30px;padding-top:16px;border-top:1px solid #eee;text-align:center">
      <p style="color:#999;font-size:11px;margin:0">
        本邮件由 <a href="https://github.com/Oscar-10-song/ai-news-digest" style="color:#2563eb">AI-News-Digest</a> 自动生成 ·
        每天 8:00 (北京时间) 发送
      </p>
    </div>
  </div>
</body></html>`;
}

export async function sendEmail(
  digest: DailyDigest,
  topStory: string,
  editorNote: string,
  appPassword: string,
  toEmail: string
): Promise<boolean> {
  if (!appPassword || appPassword.length < 10) {
    console.error("❌ Gmail App Password 未配置");
    return false;
  }

  try {
    console.error("  [gmail] 通过 SMTP 发送邮件到", toEmail, "...");

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: "ttkx1010@gmail.com",
        pass: appPassword,
      },
    });

    const info = await transporter.sendMail({
      from: '"AI 前沿日报" <ttkx1010@gmail.com>',
      to: toEmail,
      subject: `🤖 AI 前沿日报 | ${digest.date}`,
      html: buildHtml(digest, topStory, editorNote),
    });

    console.error("  [gmail] 发送成功! ID:", info.messageId);
    return true;
  } catch (error: any) {
    console.error("  [gmail] 发送失败:", error.message || error);
    return false;
  }
}
