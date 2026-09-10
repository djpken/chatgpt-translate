# ChatGPT Translate Tampermonkey Userscript

自訂 [ChatGPT Translate](https://chatgpt.com/zh-Hant/translate/) 翻譯頁面的 Tampermonkey userscript。

## 功能

- 移除「使用 ChatGPT 翻譯」標題區，並清除移除後留下的上方間距。
- 在寬度至少 `1280px` 的螢幕上，將來源與結果文字區域設定為 `600px × 700px`。
- 在較窄的螢幕上自動使用可用寬度並換行，避免水平破版。
- 將來源語言預設為英文，目標語言預設為中文。
- 使用 `MutationObserver`，支援頁面動態重新繪製。

## 安裝

1. 安裝 [Tampermonkey](https://www.tampermonkey.net/)。
2. 開啟 Tampermonkey，建立新 userscript。
3. 將 [`chatgpt-translate.user.js`](./chatgpt-translate.user.js) 的內容貼入並儲存。
4. 開啟或重新整理 ChatGPT Translate 頁面。

## 尺寸調整

尺寸設定位於 `chatgpt-translate.user.js` 頂端：

```js
const TEXTAREA_WIDTH = '600px';
const TEXTAREA_HEIGHT = '700px';
```

若 ChatGPT 更新頁面 DOM，請同步檢查腳本中的 selector。

