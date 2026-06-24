/**
 * 加密并设置单个 GitHub Actions Secret
 */
import sodium from "libsodium-wrappers";

const TOKEN = process.argv[2];
const NAME = process.argv[3];
const VALUE = process.argv[4];

if (!TOKEN || !NAME || !VALUE) {
  console.error("用法: node set-one-secret.mjs <GITHUB_TOKEN> <NAME> <VALUE>");
  process.exit(1);
}

const REPO = "Oscar-10-song/ai-news-digest";

async function main() {
  await sodium.ready;

  // 获取公钥
  const pkRes = await fetch(
    `https://api.github.com/repos/${REPO}/actions/secrets/public-key`,
    { headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/vnd.github.v3+json" } }
  );
  const { key, key_id } = await pkRes.json();
  console.error(`key_id: ${key_id}`);

  // 加密
  const keyBytes = sodium.from_base64(key, sodium.base64_variants.ORIGINAL);
  const msgBytes = sodium.from_string(VALUE);
  const enc = sodium.crypto_box_seal(msgBytes, keyBytes);
  const encB64 = sodium.to_base64(enc, sodium.base64_variants.ORIGINAL);

  // 设置
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/actions/secrets/${NAME}`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/vnd.github.v3+json", "Content-Type": "application/json" },
      body: JSON.stringify({ encrypted_value: encB64, key_id }),
    }
  );

  if (res.status === 201 || res.status === 204) {
    console.error(`✅ ${NAME} 更新成功`);
  } else {
    console.error(`❌ ${NAME} 更新失败: ${res.status} ${await res.text()}`);
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
