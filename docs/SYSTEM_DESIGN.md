# PokerPhase 系統設計文件

## 概述

PokerPhase 是一個基於 Web 的 Planning Poker 應用程式，採用前後端分離架構，支援多人即時協作進行敏捷估算。

## 技術架構

### 整體架構圖

```
┌─────────────────┐    HTTP    ┌─────────────────┐
│   Frontend      │ ◄────────► │   Backend       │
│                 │   Polling  │                 │
│ • HTML/CSS/JS   │            │ • Node.js       │
│ • 無框架設計      │            │ • Express.js    │
│ • 響應式 UI      │            │ • Memory Store  │
└─────────────────┘            └─────────────────┘
```

### 技術選型

| 層次 | 技術 | 原因 |
|------|------|------|
| 前端 | Vanilla JavaScript | 輕量、無依賴、快速部署 |
| 後端 | Node.js + Express | 輕量級、JSON 原生支援 |
| 資料儲存 | Memory (Map) | 簡單、適合小型應用 |
| 同步機制 | HTTP Polling | 相容性佳、實作簡單 |
| 樣式 | CSS3 | 現代化特效、響應式設計 |

## 前端架構

### 核心類別設計

```javascript
class PlanningPoker {
    // 狀態管理
    currentRoom: String
    currentUser: Object
    participants: Map
    votes: Map
    isHost: Boolean
    votingActive: Boolean
    votesRevealed: Boolean
    
    // UI 更新機制
    lastUIState: Object
    playedAnimations: Set
    pollInterval: Number
    
    // 核心方法
    createRoom()
    joinRoom()
    selectCard(value)
    throwBoomerang(targetUserId)
    claimHost()
    updateUI()
}
```

### 狀態管理策略

1. **本地狀態**: 使用 class 屬性管理應用狀態
2. **UI 同步**: 透過 `updateUI()` 方法統一更新介面
3. **變更偵測**: 使用 hash 比較避免不必要的 DOM 更新
4. **動畫管理**: 使用 Set 記錄已播放動畫，避免重複

### 模組化設計

```
Frontend Structure:
├── HTML (index.html)
│   ├── Welcome Screen
│   ├── Game Screen
│   │   ├── Participants Panel
│   │   ├── Main Content
│   │   └── Room Controls
│   └── Modal Components
├── CSS (style.css)
│   ├── Base Styles
│   ├── Component Styles
│   ├── Animation Definitions
│   └── Responsive Rules
└── JavaScript (script.js)
    ├── PlanningPoker Class
    ├── Event Handlers
    ├── API Communication
    └── Animation System
```

### 響應式設計

| 螢幕尺寸 | 佈局 | 特色 |
|----------|------|------|
| Desktop (>768px) | 雙欄 | 完整功能展示 |
| Tablet (768px-480px) | 單欄 | 垂直堆疊 |
| Mobile (<480px) | 緊湊 | 簡化操作 |

## 後端架構

### API 設計原則

- **RESTful**: 遵循 REST 設計規範
- **JSON**: 統一使用 JSON 格式
- **無狀態**: 每個請求包含完整資訊
- **錯誤處理**: 標準化錯誤回應

### 資料模型

```javascript
// Room Structure
{
    id: String,
    participants: {
        [userId]: {
            id: String,
            name: String,
            isHost: Boolean,
            hasVoted: Boolean,
            vote: String | null
        }
    },
    votes: {
        [userId]: String
    },
    votingActive: Boolean,
    votesRevealed: Boolean,
    currentIssue: String,
    animations: Array<Animation>,
    lastUpdated: Number
}

// Animation Structure
{
    id: String,
    fromUserId: String,
    fromUserName: String,
    targetUserId: String,
    targetUserName: String,
    projectileType: String,
    timestamp: Number
}
```

### 伺服器架構

```javascript
// Core Modules
const express = require('express');
const path = require('path');

// Data Storage
const rooms = new Map();

// Middleware
app.use(express.json());
app.use(express.static('.'));

// Route Handlers
app.get('/api/rooms/:roomId', getRoomStatus);
app.post('/api/rooms/:roomId/join', joinRoom);
app.post('/api/rooms/:roomId/vote', submitVote);
app.post('/api/rooms/:roomId/reveal', revealVotes);
app.post('/api/rooms/:roomId/new-vote', startNewVoting);
app.post('/api/rooms/:roomId/issue', updateIssue);
app.post('/api/rooms/:roomId/claim-host', claimHost);
app.post('/api/rooms/:roomId/paper-ball', throwProjectile);
app.get('/api/rooms/:roomId/leave', leaveRoom);
```

## API 規格文件

### 房間管理 API

#### 1. 取得房間狀態
```http
GET /api/rooms/{roomId}
```

**Response:**
```json
{
    "participants": {
        "user123": {
            "id": "user123",
            "name": "Alice",
            "isHost": true,
            "hasVoted": false,
            "vote": null
        }
    },
    "votes": {},
    "votingActive": true,
    "votesRevealed": false,
    "currentIssue": "準備估算第一個故事",
    "animations": [],
    "lastUpdated": 1703123456789
}
```

#### 2. 加入房間
```http
POST /api/rooms/{roomId}/join
```

**Request Body:**
```json
{
    "user": {
        "id": "user123",
        "name": "Alice",
        "isHost": false
    }
}
```

**Response:**
```json
{
    "success": true,
    "room": { /* Room Object */ }
}
```

**Error Response:**
```json
{
    "error": "姓名已被使用，請選擇其他姓名"
}
```

#### 3. 離開房間
```http
GET /api/rooms/{roomId}/leave?userId={userId}
```

**Response:**
```json
{
    "success": true
}
```

### 投票管理 API

#### 4. 提交投票
```http
POST /api/rooms/{roomId}/vote
```

**Request Body:**
```json
{
    "userId": "user123",
    "vote": "5"  // 或 null 表示取消投票
}
```

**Response:**
```json
{
    "success": true,
    "room": { /* Updated Room Object */ }
}
```

#### 5. 揭示投票結果
```http
POST /api/rooms/{roomId}/reveal
```

**Request Body:**
```json
{
    "userId": "user123"  // 必須是主持人
}
```

**Response:**
```json
{
    "success": true,
    "room": { /* Updated Room Object */ }
}
```

#### 6. 開始新投票
```http
POST /api/rooms/{roomId}/new-vote
```

**Request Body:**
```json
{
    "userId": "user123"  // 必須是主持人
}
```

**Response:**
```json
{
    "success": true,
    "room": { /* Updated Room Object */ }
}
```

### 會議管理 API

#### 7. 更新議題
```http
POST /api/rooms/{roomId}/issue
```

**Request Body:**
```json
{
    "userId": "user123",  // 必須是主持人
    "issue": "新的議題描述"
}
```

**Response:**
```json
{
    "success": true,
    "room": { /* Updated Room Object */ }
}
```

#### 8. 奪取主持人權限
```http
POST /api/rooms/{roomId}/claim-host
```

**Request Body:**
```json
{
    "userId": "user123",
    "userName": "Alice"
}
```

**Response:**
```json
{
    "success": true,
    "message": "成功獲得主持人權限"
}
```

### 互動功能 API

#### 9. 投擲提醒物
```http
POST /api/rooms/{roomId}/paper-ball
```

**Request Body:**
```json
{
    "fromUserId": "user123",
    "fromUserName": "Alice",
    "targetUserId": "user456",
    "targetUserName": "Bob",
    "projectileType": "boomerang"  // boomerang | rocket | stone
}
```

**Response:**
```json
{
    "success": true,
    "room": { /* Updated Room Object with Animation */ }
}
```

## 資料流設計

### 前端資料流

```
User Action → Event Handler → API Call → Server Response → Update State → Re-render UI
```

### 後端資料流

```
API Request → Route Handler → Data Validation → Business Logic → Update Memory → Response
```

### 即時同步機制

```
Frontend Poll (every 2s) → GET /api/rooms/{roomId} → Compare State → Update UI if Changed
```

## 安全性設計

### 前端安全

1. **輸入驗證**: 所有用戶輸入進行長度和格式檢查
2. **XSS 防護**: 使用 `escapeHtml()` 方法處理用戶輸入
3. **錯誤處理**: 優雅處理網路錯誤和伺服器錯誤

### 後端安全

1. **權限檢查**: 主持人操作需驗證 `isHost` 狀態
2. **輸入驗證**: 驗證請求參數和 body 格式
3. **資源清理**: 定期清理閒置房間和過期動畫
4. **錯誤隱藏**: 不暴露內部錯誤詳情

## 效能優化

### 前端優化

1. **DOM 更新優化**: 使用狀態比較避免不必要更新
2. **動畫效能**: 使用 CSS transform 和 will-change
3. **記憶體管理**: 定期清理動畫記錄和事件監聽器
4. **網路優化**: 合併 API 請求，減少輪詢頻率

### 後端優化

1. **記憶體管理**: 定期清理過期房間和動畫
2. **資料結構**: 使用 Map 提高查詢效能
3. **併發處理**: Express 天然支援併發請求
4. **資源限制**: 限制房間大小和動畫記錄數量

## 部署架構

### 開發環境

```bash
npm install
npm start  # 啟動在 localhost:3000
```

### 生產環境建議

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │ -> │   App Server    │ -> │   Static Files  │
│   (Nginx)       │    │   (Node.js)     │    │   (CDN)        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 擴展性考量

1. **水平擴展**: 使用 Redis 替代記憶體儲存
2. **負載均衡**: 多個 Node.js 實例
3. **CDN**: 靜態資源分離
4. **WebSocket**: 升級為真正即時通訊

## 監控與維護

### 日誌記錄

```javascript
// 關鍵操作日誌
console.log('Room created:', roomId);
console.log('User joined:', userId, userName);
console.log('Vote submitted:', userId, vote);
console.log('Animation triggered:', animationId);
```

### 健康檢查

```javascript
// 系統狀態端點
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        rooms: rooms.size,
        memory: process.memoryUsage()
    });
});
```

### 錯誤處理

```javascript
// 全域錯誤處理
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: '伺服器錯誤' });
});
```

## 測試策略

### 前端測試

1. **單元測試**: 核心邏輯方法測試
2. **整合測試**: API 呼叫和狀態更新測試
3. **E2E 測試**: 完整用戶流程測試
4. **瀏覽器測試**: 跨瀏覽器相容性測試

### 後端測試

1. **API 測試**: 所有端點的請求/回應測試
2. **負載測試**: 併發用戶和房間測試
3. **錯誤測試**: 異常情況處理測試
4. **效能測試**: 記憶體使用和回應時間測試

## 技術債務與改進建議

### 近期改進

1. **WebSocket 升級**: 真正即時通訊
2. **資料持久化**: 加入 Redis 或資料庫
3. **用戶認證**: 基本的身份驗證機制
4. **房間設定**: 可自訂卡片組合和規則

### 長期規劃

1. **微服務架構**: 拆分為獨立服務
2. **Docker 部署**: 容器化部署
3. **CI/CD 流程**: 自動化測試和部署
4. **監控告警**: 全面的系統監控

---

*文件版本: 1.0*  
*最後更新: 2025年1月*  
*維護者: Keith Hung*