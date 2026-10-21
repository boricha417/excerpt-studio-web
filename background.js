// 발췌 스튜디오 — 백그라운드 서비스 워커
// 1) 툴바 아이콘 클릭 → 현재 탭에 스튜디오 주입 + 열기
// 2) 페이지 CSP가 웹폰트 fetch를 막을 때 리디바탕을 대신 받아서 전달

// 폰트 중계는 jsDelivr CDN만 허용한다 (임의 주소 프록시 방지)
const ALLOWED_FONT_PREFIX = "https://fastly.jsdelivr.net/";

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["styles.js", "content.js"],
    });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        if (typeof window.__balcheOpen === "function") window.__balcheOpen();
      },
    });
  } catch (err) {
    // chrome:// 페이지나 웹스토어 등 주입이 금지된 페이지
    console.warn("[발췌 스튜디오] 이 페이지에서는 실행할 수 없습니다:", err?.message);
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== "bs-fetch-font") return undefined;
  (async () => {
    try {
      if (typeof message.url !== "string" || !message.url.startsWith(ALLOWED_FONT_PREFIX)) {
        throw new Error("blocked url");
      }
      const res = await fetch(message.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = await res.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      sendResponse({ ok: true, data: btoa(binary) });
    } catch (err) {
      sendResponse({ ok: false, error: String(err) });
    }
  })();
  return true; // 비동기 응답
});
