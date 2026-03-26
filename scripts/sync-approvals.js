#!/usr/bin/env node
/**
 * 同步飞书审批模板表单结构
 * 读取 configs.json 中的 approval_code，抓取对应模板的 form 结构到 approvals/ 目录
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const APP_ID = 'cli_a93f2a67c438dcc6';
const APP_SECRET = 'sD9TAPDJSzQVAEAYn6lEoeyTYJJUPoxy';
const BASE = 'https://open.feishu.cn';
const APPROVALS_DIR = path.join(__dirname, '../approvals');
const CONFIGS_FILE = path.join(__dirname, '../configs.json');

function get(path, token) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: BASE, path, method: 'GET',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    };
    const req = https.request(opts, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.end();
  });
}

function post(path, data, token) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const opts = {
      hostname: BASE, path, method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };
    const req = https.request(opts, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  // 读取 configs
  if (!fs.existsSync(CONFIGS_FILE)) {
    console.error('configs.json not found');
    process.exit(1);
  }
  const configs = JSON.parse(fs.readFileSync(CONFIGS_FILE, 'utf8'));
  const approvals = configs.approvals || {};

  // 获取 token
  const tokenRes = await post('/open-apis/auth/v3/tenant_access_token/internal', { app_id: APP_ID, app_secret: APP_SECRET });
  if (tokenRes.code !== 0) { console.error('Token error:', tokenRes.msg); process.exit(1); }
  const token = tokenRes.tenant_access_token;
  console.log('Token obtained\n');

  fs.mkdirSync(APPROVALS_DIR, { recursive: true });

  let updated = 0, failed = 0;
  for (const [name, code] of Object.entries(approvals)) {
    process.stdout.write(`Fetching ${name} (${code})... `);
    try {
      const res = await get(`/open-apis/approval/v4/approvals/${code}`, token);
      if (res.code === 0) {
        fs.writeFileSync(path.join(APPROVALS_DIR, `${code}.json`), JSON.stringify(res, null, 2));
        console.log('✓');
        updated++;
      } else {
        console.log(`✗ [${res.code}] ${res.msg}`);
        failed++;
      }
    } catch (e) {
      console.log(`✗ ${e.message}`);
      failed++;
    }
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\nDone: ${updated} updated, ${failed} failed`);
}

main();
