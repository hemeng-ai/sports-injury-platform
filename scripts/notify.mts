/**
 * 通知脚本 — CI 事件推送到 IM（Slack / 飞书 / 钉钉）
 *
 * 用法:
 *   npx tsx scripts/notify.mts <event> <status> [message]
 *
 * 环境变量:
 *   NOTIFY_WEBHOOK  - Webhook URL（必须）
 *   GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID, GITHUB_SHA (CI 自动注入)
 */

const WEBHOOK = process.env.NOTIFY_WEBHOOK;
if (!WEBHOOK) {
  console.log("⚠️  NOTIFY_WEBHOOK not set, skipping notification");
  process.exit(0);
}

const event = process.argv[2] || "unknown";
const status = process.argv[3] || "unknown";
const extraMsg = process.argv[4] || "";

const repo = process.env.GITHUB_REPOSITORY || "hemeng-ai/sports-injury-platform";
const runId = process.env.GITHUB_RUN_ID || "";
const sha = (process.env.GITHUB_SHA || "").slice(0, 7);
const runUrl = `https://github.com/${repo}/actions/runs/${runId}`;
const commitUrl = `https://github.com/${repo}/commit/${sha}`;

// ==================== 内容 ====================

const statusEmoji = status === "success" ? "✅" : status === "failure" ? "❌" : "⚠️";
const statusText = status === "success" ? "通过" : status === "failure" ? "失败" : status;

const eventLabels: Record<string, string> = {
  ci: "CI 构建",
  smoke: "生产冒烟测试",
  auto_fix: "Auto-Fix 自动修复",
  deploy: "Vercel 部署",
};

const label = eventLabels[event] || event;

// ==================== 检测平台 ====================

const isFeishu = WEBHOOK.includes("feishu") || WEBHOOK.includes("lark");
const isDingtalk = WEBHOOK.includes("dingtalk");
const isSlack = !isFeishu && !isDingtalk;

// ==================== 发送 ====================

let body: string;

if (isFeishu) {
  body = JSON.stringify({
    msg_type: "interactive",
    card: {
      header: {
        title: { tag: "plain_text", content: `${statusEmoji} ${label} ${statusText}` },
        template: status === "failure" ? "red" : status === "success" ? "green" : "blue",
      },
      elements: [
        { tag: "div", text: { tag: "lark_md", content: `**仓库**: ${repo}\n**提交**: [${sha}](${commitUrl})\n**运行**: [查看详情](${runUrl})${extraMsg ? `\n**备注**: ${extraMsg}` : ""}` } },
        { tag: "action", actions: [{ tag: "button", text: { tag: "plain_text", content: "查看详情" }, url: runUrl, type: "primary" }] },
      ],
    },
  });
} else if (isDingtalk) {
  body = JSON.stringify({
    msgtype: "markdown",
    markdown: {
      title: `${statusEmoji} ${label} ${statusText}`,
      text: `### ${statusEmoji} ${label} ${statusText}\n\n- **仓库**: ${repo}\n- **提交**: [${sha}](${commitUrl})\n- **运行**: [查看详情](${runUrl})${extraMsg ? `\n- **备注**: ${extraMsg}` : ""}`,
    },
  });
} else {
  // Slack
  body = JSON.stringify({
    text: `${statusEmoji} *${label}* ${statusText}`,
    blocks: [
      { type: "header", text: { type: "plain_text", text: `${statusEmoji} ${label} ${statusText}` } },
      { type: "section", fields: [
        { type: "mrkdwn", text: `*仓库*\n${repo}` },
        { type: "mrkdwn", text: `*提交*\n<${commitUrl}|${sha}>` },
      ]},
      { type: "section", text: { type: "mrkdwn", text: `<${runUrl}|查看详情>` + (extraMsg ? `\n${extraMsg}` : "") } },
    ],
  });
}

const response = await fetch(WEBHOOK, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body,
});

if (response.ok) {
  console.log(`📤 Notification sent (${isFeishu ? "飞书" : isDingtalk ? "钉钉" : "Slack"})`);
} else {
  console.error(`❌ Webhook failed (${response.status}):`, await response.text());
  process.exit(1);
}