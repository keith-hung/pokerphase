# PokerPhase 快速啟動指南

## 安裝與啟動

1. **安裝 Node.js 依賴**
   ```bash
   npm install
   ```

2. **啟動伺服器**
   ```bash
   npm start
   ```

3. **開啟瀏覽器**
   ```
   http://localhost:3000
   ```

## 測試多人功能

1. 在瀏覽器中開啟 `http://localhost:3000`
2. 點擊「建立新房間」，輸入您的姓名
3. 複製房間連結
4. 開啟無痕視窗或另一個瀏覽器
5. 貼上連結，輸入不同姓名加入

現在兩邊應該可以看到彼此，並且投票會即時同步！

## 伺服器功能

- ✅ 房間建立與管理
- ✅ 多人即時同步
- ✅ 投票狀態管理
- ✅ 主持人權限控制
- ✅ 自動清理非活躍房間（30分鐘）

## API 端點

- `GET /api/rooms/:roomId` - 取得房間資料
- `POST /api/rooms/:roomId/join` - 加入房間
- `POST /api/rooms/:roomId/vote` - 提交投票
- `POST /api/rooms/:roomId/reveal` - 揭示結果
- `POST /api/rooms/:roomId/new-vote` - 開始新投票
- `POST /api/rooms/:roomId/issue` - 更新議題