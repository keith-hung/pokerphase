# Contributing to PokerPhase

## 🎯 專案概述

PokerPhase 是一個為敏捷開發團隊設計的 Planning Poker 估算工具。我們歡迎社群貢獻，幫助改善這個專案。

## 📋 貢獻指南

### 開發環境設置

1. **系統需求**
   - Node.js v14 或更高版本
   - 現代瀏覽器（Chrome、Firefox、Safari、Edge）

2. **安裝與啟動**
   ```bash
   npm install
   npm start
   ```

3. **開發流程**
   - 在 `http://localhost:3000` 進行本地測試
   - 使用多個瀏覽器視窗測試多人功能

### 程式碼規範

#### 1. JavaScript 規範
- 使用 ES6+ 語法
- 變數命名使用 camelCase
- 常數使用 UPPER_SNAKE_CASE
- 函數名稱具描述性且使用動詞開頭
- 避免深層巢狀，優先使用 early return

```javascript
// ✅ 好的範例
async function updateRoomFromServer(roomData) {
    if (!roomData) return;
    
    this.participants.clear();
    // ...implementation
}

// ❌ 不好的範例
async function update(data) {
    if (data) {
        if (data.participants) {
            // 深層巢狀
        }
    }
}
```

#### 2. CSS 規範
- 使用 BEM 命名慣例
- 優先使用 CSS Grid 和 Flexbox
- 響應式設計使用 mobile-first 方法
- 使用 CSS 自訂屬性（變數）

```css
/* ✅ 好的範例 */
.participant-item {
    display: flex;
    padding: var(--spacing-sm);
}

.participant-item--voted {
    background-color: var(--color-success-light);
}

/* ❌ 不好的範例 */
.participantVoted {
    background: #c6f6d5;
}
```

#### 3. HTML 規範
- 使用語意化 HTML 標籤
- 提供適當的 ARIA 標籤
- 確保鍵盤導航支援

### 提交規範

#### Commit Message 格式
```
<type>(<scope>): <description>

<body>

<footer>
```

**Type 類型：**
- `feat`: 新功能
- `fix`: 修復 bug
- `refactor`: 重構程式碼
- `style`: 程式碼格式調整
- `docs`: 文件更新
- `test`: 測試相關
- `chore`: 建置流程或輔助工具變動

**範例：**
```
feat(boomerang): add smooth animation trajectory

- Implement 24 keyframes for ultra-smooth motion
- Fix starting position from thrower's div center
- Improve targeting to hit receiver's div center

Closes #123
```

### 分支策略

1. **main**: 穩定版本分支
2. **feature/**: 功能開發分支
3. **fix/**: 錯誤修復分支
4. **refactor/**: 重構分支

```bash
# 功能開發流程
git checkout -b feature/user-avatar-display
# 開發功能
git add .
git commit -m "feat(avatar): add user avatar display in participant list"
git push origin feature/user-avatar-display
# 建立 Pull Request
```

### Pull Request 準則

#### PR 標題格式
```
[Type] Brief description of changes
```

#### PR 描述模板
```markdown
## 變更摘要
簡述這個 PR 的主要變更內容

## 變更類型
- [ ] 新功能
- [ ] Bug 修復
- [ ] 重構
- [ ] 文件更新
- [ ] 效能改善

## 測試清單
- [ ] 本地測試通過
- [ ] 多瀏覽器測試
- [ ] 響應式設計測試
- [ ] 無障礙功能測試

## 相關 Issue
Closes #[issue number]

## 螢幕截圖
(如果有 UI 變更，請提供截圖)
```

### 測試指南

#### 功能測試清單
- [ ] 房間建立和加入
- [ ] 投票流程完整性
- [ ] 迴力鏢動畫和通知
- [ ] 主持人權限功能
- [ ] 房間離開和清理
- [ ] 跨瀏覽器同步

#### 瀏覽器相容性測試
- Chrome (最新版本)
- Firefox (最新版本)
- Safari (最新版本)
- Edge (最新版本)
- 行動裝置瀏覽器

#### 響應式測試
- 桌面 (>1200px)
- 平板 (768px-1200px)
- 手機 (320px-768px)

### 效能指南

1. **JavaScript 效能**
   - 避免頻繁的 DOM 操作
   - 使用事件委派
   - 適當使用防抖和節流

2. **CSS 效能**
   - 優先使用 transform 和 opacity 進行動畫
   - 避免觸發 layout 和 paint
   - 使用 will-change 屬性

3. **動畫效能**
   - 使用 CSS 動畫而非 JavaScript 動畫
   - 適當設置 transform-origin
   - 動畫結束後清理資源

### 無障礙功能

1. **鍵盤導航**
   - 所有互動元素可用 Tab 鍵導航
   - 提供適當的 focus 樣式
   - 支援 Enter 和 Space 鍵操作

2. **螢幕閱讀器**
   - 使用語意化 HTML 標籤
   - 提供 alt 文字和 aria-label
   - 動態內容更新使用 aria-live

3. **視覺設計**
   - 確保足夠的色彩對比度
   - 不依賴顏色傳達資訊
   - 支援減少動畫偏好設定

### 國際化

1. **多語言支援**
   - 中文（繁體）為主要語言
   - 技術術語保持英文
   - 可擴展至其他語言

2. **文字處理**
   - 避免硬編碼文字
   - 使用語言檔案管理文字內容
   - 考慮文字長度變化對佈局的影響

### 錯誤處理

1. **用戶端錯誤**
   - 提供友善的錯誤訊息
   - 優雅的降級處理
   - 記錄錯誤以便除錯

2. **網路錯誤**
   - 實作重試機制
   - 顯示連線狀態
   - 離線功能支援

### 文件更新

當進行變更時，請確保更新相關文件：

1. **README.md**: 功能說明、安裝指南
2. **USER_STORY.md**: 使用者故事和需求
3. **CLAUDE.md**: 專案維護規則
4. **API 文件**: 如果有 API 變更
5. **範例程式碼**: 如果有使用方法變更

### 發布流程

1. **版本號規則** (語意化版本)
   - MAJOR: 不相容的 API 變更
   - MINOR: 向下相容的功能新增
   - PATCH: 向下相容的錯誤修復

2. **發布清單**
   - [ ] 所有測試通過
   - [ ] 文件已更新
   - [ ] 版本號已更新
   - [ ] 變更日誌已記錄

### 社群參與

1. **問題回報**
   - 使用 Issue 範本
   - 提供詳細的重現步驟
   - 包含環境資訊

2. **功能建議**
   - 描述使用場景
   - 解釋預期行為
   - 考慮對現有功能的影響

3. **討論參與**
   - 尊重不同觀點
   - 建設性的回饋
   - 專注於技術討論

## 🤝 授權協議

本專案採用 MIT License，詳見 [LICENSE](LICENSE) 檔案。

## 📞 聯絡方式

如有任何問題或建議，歡迎：
- 建立 Issue
- 發起 Discussion
- 提交 Pull Request

感謝您的貢獻！讓我們一起讓 PokerPhase 變得更好！ 🎯