#!/usr/bin/env node
/**
 * 飞书审批发起脚本
 * 用法: node create-approval.js <approval_code> <form_json_string>
 * 
 * 示例:
 *   node create-approval.js 9D540774-EB3D-4635-8515-DFEA3CEFB515 '[{"id":"...","type":"radioV2","value":"..."}]'
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ===== 配置 =====
const APP_ID = 'cli_a93f2a67c438dcc6';
const APP_SECRET = 'sD9TAPDJSzQVAEAYn6lEoeyTYJJUPoxy';
const USER_OPEN_ID = 'ou_f32ac815f5dcefd246cd52869ecec6d8';
const APPROVALS_DIR = path.join(__dirname, '../approvals');
const CONFIGS_FILE = path.join(__dirname, '../configs.json');

// ===== 获取 tenant_access_token =====
function getTenantToken() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET });
    const options = {
      hostname: 'open.feishu.cn',
      path: '/open-apis/auth/v3/tenant_access_token/internal',
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(data) }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        const d = JSON.parse(body);
        if (d.code === 0) resolve(d.tenant_access_token);
        else reject(new Error(`获取token失败: ${d.msg}`));
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ===== 创建审批实例 =====
function createApprovalInstance(token, approvalCode, formJson) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      approval_code: approvalCode,
      open_id: USER_OPEN_ID,
      form: formJson,
      locale: 'zh-CN'
    });
    const options = {
      hostname: 'open.feishu.cn',
      path: '/open-apis/approval/v4/instances',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        const d = JSON.parse(body);
        if (d.code === 0) resolve(d.data);
        else reject(new Error(`创建审批失败[${d.code}]: ${d.msg}`));
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// ===== 主函数 =====
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('用法: node create-approval.js <approval_code> <form_json_string>');
    console.error("示例: node create-approval.js 9D540774-EB3D-4635-8515-DFEA3CEFB515 '[{...}]'");
    process.exit(1);
  }

  const approvalCode = args[0];
  const formJson = args[1];

  // 验证表单
  let formParsed;
  try {
    formParsed = JSON.parse(formJson);
  } catch (e) {
    console.error('表单JSON格式错误:', e.message);
    process.exit(1);
  }

  // 输出审批信息（优先从 configs.json 查找名称，再查表单文件）
  let approvalName = approvalCode;
  if (fs.existsSync(CONFIGS_FILE)) {
    const configs = JSON.parse(fs.readFileSync(CONFIGS_FILE, 'utf8'));
    for (const [name, code] of Object.entries(configs.approvals || {})) {
      if (code === approvalCode) {
        approvalName = name;
        break;
      }
    }
  }
  const approvalFile = path.join(APPROVALS_DIR, `${approvalCode}.json`);
  if (fs.existsSync(approvalFile)) {
    const meta = JSON.parse(fs.readFileSync(approvalFile, 'utf8'));
    approvalName = meta.data?.approval_name || approvalName;
  }
  console.log(`审批类型: ${approvalName}`);
  console.log(`审批代码: ${approvalCode}`);

  console.log(`发起人: 王云涛 (${USER_OPEN_ID})`);
  console.log(`表单字段数: ${formParsed.length}`);

  try {
    console.log('\n正在获取 tenant_access_token...');
    const token = await getTenantToken();
    console.log('Token 获取成功');

    console.log('正在发起审批...');
    const result = await createApprovalInstance(token, approvalCode, formJson);
    console.log('\n✅ 审批发起成功！');
    console.log(`实例代码: ${result.instance_code}`);
    console.log(`查看链接: https://www.feishu.cn/approval instanceCode=${result.instance_code}`);
  } catch (e) {
    console.error('\n❌ 错误:', e.message);
    process.exit(1);
  }
}

main();
