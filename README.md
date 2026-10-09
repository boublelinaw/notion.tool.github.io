# 🧩 Notion 嵌入工具箱

為 Notion 頁面製作嵌入小工具（widget）的網站，Notion 風格介面，支援手機與深色模式。純靜態網站，不需建置，直接放上 GitHub Pages 即可使用。

## 工具

| 工具 | 說明 |
| --- | --- |
| ⏳ 倒數 / 累積計日 | 倒數、累積、每年紀念日；可選時區（預設台北）；顯示到天／時／分／秒 |
| 🗓️ 時間軸 | 直向／橫向、左右交錯、可匯出 PNG |
| 💬 聊天室展示 | LINE／iMessage／Notion 風格，自訂頭貼、名稱、訊息，可匯出 PNG |
| 🖼️ 多圖展示庫 | 滑動、點擊切換、縮圖／圓點、自動播放 |
| 🏷️ 置中標題 / 橫幅 | 漸層、Notion 色、圖片背景、裝飾線 |
| 🧮 方程式標題產生器 | 產生 Notion「公式」屬性程式碼（置中、上色、自動日期與天數） |
| 🕰️ 時鐘、📊 進度條、💭 語錄卡 | 額外小工具 |

## 發布到 GitHub Pages

1. 到 GitHub 儲存庫 **Settings → Pages**。
2. Source 選 **Deploy from a branch**，Branch 選要發布的分支（例如 `main`）與 `/ (root)`，按 Save。
3. 約一分鐘後網址為 `https://<使用者名稱>.github.io/notion.tool.github.io/`。

> 若想要網址是 `https://<使用者名稱>.github.io/`（沒有子路徑），儲存庫名稱需改為 `<使用者名稱>.github.io`。網站使用相對路徑，兩種方式都能正常運作。

## 檔案結構

```
index.html                 網站（工具編輯器）
embed.html                 嵌入頁（貼到 Notion 的就是這個網址）
assets/css/app.css         網站樣式
assets/css/widgets.css     嵌入工具樣式
assets/js/core.js          共用：Notion 配色、設定編碼、時區計算
assets/js/embed.js         嵌入頁載入器
assets/js/app.js           網站主程式（路由、表單、預覽、作品、圖庫、帳號）
assets/js/auth.js          帳號與資料儲存
assets/js/widgets/*.js     每個工具一個檔案（預設值、表單欄位、渲染）
assets/data/changelog.js   ✏️ 更新紀錄（新版本加在最上面）
assets/data/guide.js       ✏️ 使用教學內容
assets/vendor/             html2canvas（匯出 PNG 用）
```

### 新增一個工具

在 `assets/js/widgets/` 新增檔案，呼叫 `NT.register({ id, name, icon, desc, height, defaults, fields, render })`，再到 `index.html` 加一行 `<script>` 即可，表單會依 `fields` 自動產生。

## 運作方式

- 所有設定壓縮後存在嵌入連結的網址參數中（`embed.html?w=<工具>&c=<設定>`），不需要伺服器，網站更新也不會讓舊連結失效。
- **帳號系統**：GitHub Pages 沒有後端，目前帳號、作品、圖庫存在使用者瀏覽器的 localStorage，密碼以 PBKDF2-SHA256 加鹽雜湊。可在「帳號」頁匯出／匯入備份以跨裝置使用。若日後要雲端同步，替換 `assets/js/auth.js` 中的 `backend` 物件（例如改接 Firebase / Supabase）即可。
