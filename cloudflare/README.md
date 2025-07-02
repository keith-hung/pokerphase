# PokerPhase Cloudflare - Workers + Durable Objects 版本

這是 PokerPhase 的全球邊緣部署版本，使用 Cloudflare Workers 和 WebSocket 即時同步。

## 🎯 適用場景

- **全球團隊協作**：<50ms 全球延遲
- **高併發需求**：自動無限擴展
- **即時同步**：WebSocket 零延遲體驗
- **無維護部署**：完全 Serverless 架構

## 🚀 快速開始

### 前置需求

1. **Cloudflare 帳號**：註冊免費帳號
2. **Workers 付費方案**：$5/月（支援 Durable Objects）
3. **Wrangler CLI**：Cloudflare 官方工具

### 本地開發

1. **安裝依賴**
   ```bash
   npm install
   ```

2. **登入 Cloudflare**
   ```bash
   npx wrangler login
   ```

3. **啟動開發服務器**
   ```bash
   npm run dev
   ```

4. **訪問應用**
   ```
   http://localhost:8787
   ```

### 部署到生產環境

1. **預覽部署**
   ```bash
   npm run preview
   ```

2. **正式部署**
   ```bash
   npm run deploy
   ```

3. **查看即時日誌**
   ```bash
   npm run tail
   ```

## 🏗️ 技術架構

### 後端
- **Cloudflare Workers**：邊緣運算環境
- **Durable Objects**：分散式狀態管理
- **WebSocket**：雙向即時通訊

### 前端
- **WebSocket Client**：即時狀態同步
- **自動重連**：網路中斷自動恢復
- **優雅降級**：WebSocket 失敗時回退 HTTP

### 資料流程
```
全球用戶 ↔ WebSocket ↔ Edge Worker ↔ Durable Object
    ↓                      ↓              ↓
低延遲存取           路由與快取        持久化狀態
```

## 📁 檔案結構

```
cloudflare/
├── src/                    # Worker 原始碼
│   ├── index.js           # 主要入口點
│   └── room.js            # Durable Object
├── public/                # 前端資源
│   ├── index.html        # WebSocket 版本
│   ├── script.js         # WebSocket 客戶端
│   └── style.css         # 樣式檔案
├── scripts/               # 工具腳本
│   ├── test-deployment.js
│   └── upload-assets.js
├── wrangler.toml         # Cloudflare 配置
├── package.json          # 依賴管理
└── README.md             # 說明文件
```

## ⚡ 效能優勢

### 🌍 全球邊緣部署
- **300+ 數據中心**：覆蓋全球
- **智能路由**：自動選擇最近節點
- **CDN 整合**：靜態資源超快載入

### 🔄 即時同步
- **WebSocket 連線**：毫秒級狀態更新
- **自動重連**：網路恢復後自動連接
- **心跳檢測**：確保連線穩定性

### 📈 自動擴展
- **零配置擴展**：自動處理流量尖峰
- **無冷啟動**：Edge Workers 瞬間響應
- **資源隔離**：每個房間獨立 Durable Object

## 💰 成本結構

### Cloudflare Workers 定價
- **免費額度**：100,000 requests/day
- **付費方案**：$5/month + 使用量
- **Durable Objects**：$0.15/GB storage

### 實際使用成本
- **小型團隊 (5-10人)**：$5-10/月
- **中型組織 (50-100人)**：$20-50/月
- **大型企業 (500+人)**：$100-300/月

## 🔧 配置選項

### wrangler.toml
```toml
name = "pokerphase"
main = "src/index.js"
compatibility_date = "2024-01-01"

[[durable_objects.bindings]]
name = "ROOM"
class_name = "Room"
```

### 環境變數
- `ENVIRONMENT`：部署環境
- `DEBUG_MODE`：調試模式

## 🛠️ 開發工具

### 本地調試
```bash
npm run dev          # 本地開發服務器
npm run tail         # 查看即時日誌
npm run test         # 運行測試套件
```

### 部署管理
```bash
npm run preview      # 預覽環境部署
npm run deploy       # 生產環境部署
wrangler rollback    # 回滾部署
```

## 🔍 監控與日誌

### Cloudflare Dashboard
- **即時流量**：請求數量和延遲
- **錯誤追蹤**：異常和故障分析
- **效能指標**：回應時間分布

### 日誌查看
```bash
# 即時日誌
npm run tail

# 特定時間範圍
wrangler tail --since=1h

# 過濾條件
wrangler tail --grep="ERROR"
```

## 🆚 vs Traditional 版本

| 特色 | Cloudflare | Traditional |
|------|------------|-------------|
| 延遲 | <50ms 全球 | 依伺服器位置 |
| 同步方式 | WebSocket | HTTP 輪詢 |
| 擴展性 | 自動無限 | 手動擴展 |
| 維護成本 | 零維護 | 需要管理 |
| 離線支援 | ❌ | ✅ |
| 複雜度 | 中等 | 簡單 |

## 🚨 注意事項

1. **付費需求**：Durable Objects 需要付費方案
2. **學習曲線**：需要了解 Cloudflare 生態系統
3. **除錯差異**：與傳統 Node.js 環境不同
4. **網路依賴**：必須有網路連線

## 📞 支援

- 查看 [Cloudflare Workers 文件](https://developers.cloudflare.com/workers/)
- 參考 [Durable Objects 指南](https://developers.cloudflare.com/workers/learning/using-durable-objects/)
- 如需簡單部署，請使用 Traditional 版本