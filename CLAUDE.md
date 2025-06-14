# Claude Code 專案指引

## 專案維護規則

### 1. 文件同步檢查
- 總是檢查 README.md 是否符合現況，必要時請更新
- 確保專案文件與實際功能保持一致

### 2. 需求文件管理
- 總是在 USER_STORY.md 以 user story 的格式寫下所有需求
- 根據每次的需求變更做更新
- 保持需求文件的完整性和準確性

### 3. 變更管理規範
- 進行任何程式碼變更時，必須遵守 CONTRIBUTING.md 中的規範
- 確保程式碼品質、測試覆蓋率和文件一致性
- 遵循提交訊息格式和分支策略

## 專案說明

這是一個 Planning Poker（敏捷估算）web 應用程式，提供團隊進行故事點估算的工具。

### 主要功能
- 房間建立與加入
- 匿名投票系統
- 即時同步機制
- 迴力鏢提醒功能
- 主持人管理功能

### 技術架構
- 前端：HTML/CSS/JavaScript
- 後端：Node.js + Express
- 資料同步：HTTP 輪詢機制
- 部署：本地開發服務器