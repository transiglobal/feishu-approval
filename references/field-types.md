# 飞书审批字段类型参考

每个审批模板的表单字段从 `approvals/{code}.json` 中读取 `form` 字段（JSON字符串）。

## 字段类型对照表

| 字段类型 | type 值 | value 格式 |
|---------|---------|-----------|
| 单行文本 | input | 字符串 |
| 多行文本 | textarea | 字符串 |
| 日期 | date | RFC3339 格式（如 2026-03-25T00:00:00+08:00） |
| 日期范围 | dateInterval | {start, end, interval} |
| 单选 | radioV2 | 选项的 value 值（字符串） |
| 多选 | checkboxV2 | 字符串数组 |
| 数字 | number | 数字 |
| 金额 | amount | {value: 数字, currency: 币种}，如 {value:100, currency:"CNY"} |
| 明细表 | fieldList | **二维数组**，格式见下方 |
| 附件 | attachmentV2 | 文件 token 数组 |
| 部门 | department | [{open_id: "xxx"}] |
| 联系方式 | telephone | {countryCode, nationalNumber} |

## 明细表（fieldList）格式

fieldList 的 value 是二维数组，每行是一个子控件的数组：
```json
"value": [
  [
    {"id": "子控件ID1", "type": "input", "value": "内容1"},
    {"id": "子控件ID2", "type": "date", "value": "2026-03-25T00:00:00+08:00"},
    {"id": "子控件ID3", "type": "amount", "value": 100, "currency": "CNY"}
  ]
]
```
多行明细 = 多个子数组。

## 计算公式（formula）

该字段由系统根据明细表自动计算，通常**不需要传值**（飞书自动汇总）。

## form 数据构造要点

- form 是**JSON数组**的**字符串**形式（需要压缩和转义）
- 所有字段的 id 必须与模板中的 widget id 完全一致
- 日期必须是 RFC3339 格式
- 单选/多选的 value 必须是选项定义中的 value 值（非显示文本）
- 明细表是二维数组
- 金额字段带 currency 字段
- 计算公式字段若无则不传
