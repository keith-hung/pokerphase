# PokerPhase User Stories

## Epic: Planning Poker 線上估算工具

### 使用者類型
- **Scrum Master / 主持人**: 負責管理估算會議的人員
- **開發團隊成員**: 參與估算的團隊成員
- **產品負責人**: 可能參與估算討論的產品負責人

---

## Theme 1: 房間管理與參與

### US-001: 建立估算房間
**身為** Scrum Master  
**我想要** 建立一個新的估算房間  
**以便** 團隊成員可以加入進行 Planning Poker 估算  

**驗收條件:**
- 點擊「建立新房間」按鈕
- 輸入主持人姓名
- 自動產生房間 ID 和邀請連結
- 主持人自動成為第一個參與者
- 可以複製房間連結分享給團隊

### US-002: 加入估算房間
**身為** 團隊成員  
**我想要** 透過房間 ID 或連結加入估算房間  
**以便** 參與團隊的故事點估算活動  

**驗收條件:**
- 可透過房間 ID 手動加入
- 可透過連結直接加入
- 輸入個人姓名
- 如果房間為空，第一個進入者自動成為主持人
- 姓名不可重複

### US-003: 自動離開房間
**身為** 使用者  
**我想要** 在關閉瀏覽器視窗時自動離開房間  
**以便** 不會佔用房間位置影響其他人  

**驗收條件:**
- 關閉瀏覽器視窗時自動離開
- 其他參與者會看到該使用者離開
- 如果主持人離開，自動指派新主持人
- 如果房間變空，自動清理房間

---

## Theme 2: 估算投票流程

### US-004: 匿名投票
**身為** 團隊成員  
**我想要** 選擇故事點數進行匿名投票  
**以便** 避免錨定效應，獲得更準確的估算結果  

**驗收條件:**
- 提供斐波那契數列卡片 (0,1,2,3,5,8,13,21,?)
- 選擇卡片後顯示已投票狀態
- 其他人無法看到具體投票內容
- 可以修改投票選擇（在結果揭示前）

### US-005: 主持人強制開票
**身為** Scrum Master  
**我想要** 在部分人員投票後就能強制開票  
**以便** 推進會議進度，不被個別人員拖延  

**驗收條件:**
- 至少一人投票後，主持人可見「強制開票」按鈕
- 點擊後立即揭示所有已投票結果
- 未投票者顯示為「未投票」
- 強制開票不影響後續重新投票

### US-006: 查看投票結果
**身為** 團隊成員  
**我想要** 看到所有人的投票結果  
**以便** 了解團隊對故事複雜度的不同看法  

**驗收條件:**
- 顯示每個人的投票數值
- 標示最高和最低估算值
- 顯示未投票的成員
- 結果按參與者排列顯示

---

## Theme 3: 會議管理功能

### US-007: 重新投票
**身為** Scrum Master  
**我想要** 開始新一輪投票  
**以便** 在討論後重新估算故事點數  

**驗收條件:**
- 清除所有人的投票狀態
- 重置為投票階段
- 保持相同議題
- 所有人可重新選擇卡片

### US-008: 切換議題
**身為** Scrum Master  
**我想要** 切換到下一個待估算議題  
**以便** 完成整個 Sprint 的估算工作  

**驗收條件:**
- 更新議題標題
- 自動重置投票狀態
- 進入新的投票輪次
- 議題編號自動遞增

---

## Theme 4: 互動與提醒功能

### US-009: 迴力鏢提醒功能
**身為** 任何參與者  
**我想要** 向還沒投票的人丟迴力鏢  
**以便** 提醒他們盡快投票  

**驗收條件:**
- 點擊未投票參與者名稱可丟迴力鏢
- 迴力鏢有華麗的飛行動畫效果
- 被丟的人會收到提醒通知
- 不能對自己丟迴力鏢
- 投票結束後不能丟迴力鏢

### US-010: 主持人特殊權限
**身為** Scrum Master  
**我想要** 對任何人丟迴力鏢（包括已投票者）  
**以便** 管理會議秩序和催促討論  

**驗收條件:**
- 主持人可對任何人（除自己）丟迴力鏢
- 可對已投票者丟迴力鏢
- 迴力鏢動畫從丟出者畫圓弧飛到目標
- 擊中時有爆炸特效和螢幕震動
- 迴力鏢自轉速度為8圈（2880度）
- 飛行時間1.53秒，快速且流暢

### US-011: 奪取主持人權限
**身為** 參與者  
**我想要** 能夠奪取主持人權限  
**以便** 在原主持人無法操作時接管會議  

**驗收條件:**
- 非主持人可見「奪取主持人」按鈕
- 點擊後立即獲得主持人權限
- 原主持人失去所有管理權限
- 原主持人可見「奪取主持人」按鈕
- 所有管理按鈕權限即時更新
- 伺服器端同步主持人狀態變更

### US-015: 房間關閉處理
**身為** 參與者  
**我想要** 在房間被關閉時自動返回主畫面  
**以便** 知道房間狀態並能重新開始  

**驗收條件:**
- 定期檢查房間是否仍存在
- 房間不存在時停止輪詢
- 自動清理應用程式狀態
- 返回歡迎畫面
- 清除 URL 參數
- 顯示通知訊息

---

## Theme 5: 即時同步與狀態管理

### US-011: 跨瀏覽器同步
**身為** 使用者  
**我想要** 在不同瀏覽器視窗間看到相同的房間狀態  
**以便** 確保資訊同步，包括無痕模式  

**驗收條件:**
- 正常和無痕瀏覽器視窗同步
- 每2秒自動更新房間狀態
- 新參與者加入時即時顯示
- 投票狀態變化即時反映

### US-012: 房間狀態顯示
**身為** 參與者  
**我想要** 清楚看到當前投票進度  
**以便** 了解會議進行狀況  

**驗收條件:**
- 顯示參與者總數
- 顯示已投票/總人數比例
- 標示參與者投票狀態
- 標示主持人身份
- 顯示當前房間 ID

---

## Theme 6: 使用者體驗優化

### US-013: 響應式介面
**身為** 行動裝置使用者  
**我想要** 在手機/平板上也能順暢使用  
**以便** 在任何地點參與估算會議  

**驗收條件:**
- 手機介面單欄佈局
- 平板介面適中尺寸
- 桌面介面雙欄佈局
- 觸控操作友善
- 所有功能在各裝置正常運作

### US-014: 視覺回饋與動畫
**身為** 使用者  
**我想要** 有吸引人的視覺效果  
**以便** 讓估算過程更有趣和投入  

**驗收條件:**
- 卡片選擇有懸停動畫
- 投票狀態有視覺指示
- 結果揭示有淡入效果
- 迴力鏢有完整飛行軌跡動畫
- 支援減少動畫偏好設定

---

## 技術需求 (Technical Stories)

### TS-001: HTTP 輪詢同步機制
實作每2秒向伺服器查詢房間狀態的輪詢機制，確保跨瀏覽器同步。

### TS-002: 智慧 DOM 更新
只在實際狀態變更時更新 DOM，避免動畫重複觸發。

### TS-003: sendBeacon 離開偵測
使用 navigator.sendBeacon API 確保視窗關閉時能可靠地通知伺服器。

### TS-004: 記憶體房間管理
伺服器端使用 Map 儲存房間狀態，定期清理閒置房間。

---

## 非功能性需求

### NFR-001: 效能
- 頁面載入時間 < 2秒
- 投票響應時間 < 500ms
- 同步延遲 < 3秒

### NFR-002: 相容性
- 支援 Chrome, Firefox, Safari, Edge
- 支援 iOS Safari, Android Chrome
- 相容 Node.js v14+

### NFR-003: 可用性
- 介面直覺，無需教學即可使用
- 錯誤訊息清楚明確
- 支援鍵盤操作

---

*最後更新：2025年1月 - 已實作所有核心功能*