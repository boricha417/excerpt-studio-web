// 발췌 스튜디오 — 콘텐츠 스크립트 (아무 페이지에서나 동작)
// 툴바 아이콘 클릭 → window.__balcheOpen() 호출 → 선택한 글(또는 붙여넣기)로 발췌 카드 편집
(() => {
  "use strict";

  if (window.__balcheStudioLoaded) return;
  window.__balcheStudioLoaded = true;

  // ──────────────────────────────────────────────
  // 상수
  // ──────────────────────────────────────────────
  const PREFS_KEY = "bs-studio-prefs-web-v1";
  const INK = "#2F3437";

  const HIGHLIGHTS = {
    y: { label: "노랑", color: "#FFDF7E" },
    g: { label: "초록", color: "#B9E6B0" },
    p: { label: "분홍", color: "#F9C6D9" },
    b: { label: "파랑", color: "#B4DAF7" },
  };
  const CENSOR = "censor";

  // 밑줄은 얇은 선이라 형광펜보다 짙은 색을 쓴다.
  const UNDERLINES = {
    uy: { color: "#E0A93E" },
    ug: { color: "#5FA85A" },
    up: { color: "#D9648F" },
    ub: { color: "#4A8FD4" },
  };

  const TEXTURES = {
    snow: { label: "화이트", base: "#FBFBFA", text: "#2F3437", grainDark: 0.02, grainLight: 0.0 },
    dark: { label: "다크", base: "#26231F", text: "#EFE8DA", grainDark: 0.0, grainLight: 0.045 },
    cream: { label: "크림", base: "#F5EEDB", text: "#31291C", grainDark: 0.045, grainLight: 0.05 },
    kraft: { label: "크라프트", base: "#D5BC92", text: "#3A2D1A", grainDark: 0.06, grainLight: 0.06 },
  };

  const FONT_FALLBACK = '"Pretendard", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
  // 전부 무료 배포 폰트의 jsDelivr CDN 미러 — 기기에 설치돼 있으면 그쪽을 먼저 쓰고,
  // 없으면 내려받는다. 페이지 CSP가 fetch를 막으면 백그라운드가 대신 받아온다.
  const WEBFONTS = {
    pretendard: {
      family: "Pretendard",
      url: "https://fastly.jsdelivr.net/npm/pretendard@1.3.9/dist/web/static/woff2/Pretendard-Regular.woff2",
    },
    ridi: {
      family: "RIDIBatang",
      url: "https://fastly.jsdelivr.net/gh/projectnoonnu/noonfonts_twelve@1.0/RIDIBatang.woff",
    },
    gowun: {
      family: "Gowun Dodum",
      url: "https://fastly.jsdelivr.net/npm/@fontsource/gowun-dodum@4.5.10/files/gowun-dodum-all-400-normal.woff",
    },
    nanumgothic: {
      family: "Nanum Gothic",
      url: "https://fastly.jsdelivr.net/npm/@fontsource/nanum-gothic@4.5.7/files/nanum-gothic-all-400-normal.woff",
    },
    nanummyeongjo: {
      family: "Nanum Myeongjo",
      url: "https://fastly.jsdelivr.net/npm/@fontsource/nanum-myeongjo@4.5.9/files/nanum-myeongjo-all-400-normal.woff",
    },
    ibmplex: {
      family: "IBM Plex Sans KR",
      url: "https://fastly.jsdelivr.net/npm/@fontsource/ibm-plex-sans-kr@4.5.10/files/ibm-plex-sans-kr-all-400-normal.woff",
    },
    notosans: {
      family: "Noto Sans KR",
      url: "https://fastly.jsdelivr.net/npm/@fontsource/noto-sans-kr@4.5.12/files/noto-sans-kr-all-400-normal.woff",
    },
  };
  const CUSTOM_FONT_VALUE = "__custom__";
  const BUILTIN_FONTS = [
    { label: "기본 (페이지 폰트)", value: "" },
    { label: "Pretendard", webfont: "pretendard", value: `"Pretendard", "Malgun Gothic", sans-serif` },
    {
      label: "리디바탕",
      webfont: "ridi",
      value: '"RIDIBatang", "RIDI Batang", "리디바탕", "Noto Serif KR", Batang, serif',
    },
    { label: "고운돋움", webfont: "gowun", value: '"Gowun Dodum", "고운돋움", "Malgun Gothic", sans-serif' },
    { label: "나눔고딕", webfont: "nanumgothic", value: '"Nanum Gothic", "나눔고딕", NanumGothic, sans-serif' },
    { label: "나눔명조", webfont: "nanummyeongjo", value: '"Nanum Myeongjo", "나눔명조", NanumMyeongjo, serif' },
    { label: "IBM Plex Sans KR", webfont: "ibmplex", value: '"IBM Plex Sans KR", sans-serif' },
    { label: "Noto Sans KR", webfont: "notosans", value: '"Noto Sans KR", "본고딕", sans-serif' },
    { label: "기기 폰트 직접 입력…", value: CUSTOM_FONT_VALUE },
  ];

  const CJK_RE =
    /[ᄀ-ᇿ⺀-〿぀-ヿ㄰-㆏ㇰ-䶿一-鿿ꥠ-꥿가-퟿豈-﫿＀-￯]/;

  // ──────────────────────────────────────────────
  // 상태
  // ──────────────────────────────────────────────
  const state = {
    baseText: "",
    text: "",
    marks: [], // { start, end, type }
    fontSize: 18,
    fontFamily: "",
    customFont: "",
    align: "left",
    textColor: INK,
    dialogueEnabled: false,
    dialogueColor: "#9F2F2D",
    cornerRadius: 16,
    cardWidth: 640,
    heightMode: "auto",
    cardHeight: 640,
    vAlign: "top",
    showTitle: true,
    showAuthor: true,
    titleText: "",
    authorText: "",
    replaceRules: [],
    bg: { mode: "texture", color: "#FFFFFF", texture: "cream", pattern: "grain", imageData: null, dim: 0, bright: 0 },
  };

  // ──────────────────────────────────────────────
  // 설정 저장 (chrome.storage, 없으면 localStorage)
  // ──────────────────────────────────────────────
  async function storageGet() {
    try {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        const found = await chrome.storage.local.get(PREFS_KEY);
        if (found && found[PREFS_KEY]) return found[PREFS_KEY];
      }
    } catch {
      /* 무시 */
    }
    try {
      return JSON.parse(localStorage.getItem(PREFS_KEY) || "null");
    } catch {
      return null;
    }
  }
  function storageSet(prefs) {
    try {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [PREFS_KEY]: prefs });
        return;
      }
    } catch {
      /* 무시 */
    }
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      /* 무시 */
    }
  }

  function loadPrefsFrom(p) {
    if (!p) return;
    try {
      if (typeof p.fontSize === "number") state.fontSize = Math.min(44, Math.max(12, p.fontSize));
      if (typeof p.fontFamily === "string") state.fontFamily = p.fontFamily;
      if (typeof p.customFont === "string") state.customFont = p.customFont;
      if (["left", "center", "right", "justify"].includes(p.align)) state.align = p.align;
      if (typeof p.cardWidth === "number") state.cardWidth = Math.min(1080, Math.max(420, p.cardWidth));
      if (["auto", "fixed"].includes(p.heightMode)) state.heightMode = p.heightMode;
      if (typeof p.cardHeight === "number") state.cardHeight = Math.min(1800, Math.max(360, p.cardHeight));
      if (["top", "center"].includes(p.vAlign)) state.vAlign = p.vAlign;
      if (typeof p.textColor === "string") state.textColor = p.textColor;
      if (typeof p.dialogueEnabled === "boolean") state.dialogueEnabled = p.dialogueEnabled;
      if (typeof p.dialogueColor === "string") state.dialogueColor = p.dialogueColor;
      if (typeof p.cornerRadius === "number") state.cornerRadius = Math.min(60, Math.max(0, p.cornerRadius));
      if (typeof p.showTitle === "boolean") state.showTitle = p.showTitle;
      if (typeof p.showAuthor === "boolean") state.showAuthor = p.showAuthor;
      if (Array.isArray(p.replaceRules)) {
        state.replaceRules = p.replaceRules
          .filter((r) => r && typeof r.find === "string" && typeof r.replace === "string")
          .slice(0, 20)
          .map((r) => ({ find: r.find, replace: r.replace }));
      }
      if (p.bg && typeof p.bg === "object") {
        if (["solid", "texture"].includes(p.bg.mode)) state.bg.mode = p.bg.mode;
        if (typeof p.bg.color === "string") state.bg.color = p.bg.color;
        if (TEXTURES[p.bg.texture]) state.bg.texture = p.bg.texture;
        if (["grain", "grid", "lines", "none"].includes(p.bg.pattern)) state.bg.pattern = p.bg.pattern;
      }
    } catch {
      /* 무시 */
    }
  }
  function savePrefs() {
    storageSet({
      fontSize: state.fontSize,
      fontFamily: state.fontFamily,
      customFont: state.customFont,
      align: state.align,
      cardWidth: state.cardWidth,
      heightMode: state.heightMode,
      cardHeight: state.cardHeight,
      vAlign: state.vAlign,
      textColor: state.textColor,
      dialogueEnabled: state.dialogueEnabled,
      dialogueColor: state.dialogueColor,
      cornerRadius: state.cornerRadius,
      showTitle: state.showTitle,
      showAuthor: state.showAuthor,
      replaceRules: state.replaceRules,
      bg: {
        mode: state.bg.mode === "image" ? "texture" : state.bg.mode,
        color: state.bg.color,
        texture: state.bg.texture,
        pattern: state.bg.pattern,
      },
    });
  }

  // ──────────────────────────────────────────────
  // 유틸
  // ──────────────────────────────────────────────
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }
  function hexToRgba(hex, alpha) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) return `rgba(47,52,55,${alpha})`;
    const n = parseInt(m[1], 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
  }
  function debounce(fn, wait) {
    let t = 0;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  /** 슬라이더 + 직접 입력 숫자칸이 묶인 컨트롤 한 줄 */
  function numericControl({ label, min, max, step, value, onChange }) {
    const row = el("div", "bs-row");
    row.appendChild(el("label", "bs-label", label));
    const slider = el("input", "bs-slider");
    slider.type = "range";
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step || 1);
    slider.value = String(value);
    const num = el("input", "bs-num");
    num.type = "number";
    num.min = String(min);
    num.max = String(max);
    num.step = "1";
    num.value = String(value);
    const commit = (raw, syncNum) => {
      let v = Number(raw);
      if (!Number.isFinite(v)) return;
      v = Math.min(max, Math.max(min, Math.round(v)));
      slider.value = String(v);
      if (syncNum) num.value = String(v);
      onChange(v);
    };
    slider.addEventListener("input", () => commit(slider.value, true));
    num.addEventListener("input", () => {
      const v = Number(num.value);
      if (Number.isFinite(v) && v >= min && v <= max) commit(v, false);
    });
    num.addEventListener("change", () => commit(num.value, true));
    row.appendChild(slider);
    row.appendChild(num);
    return row;
  }

  /** 큰따옴표("…", "…")로 묶인 대사 구간을 찾는다 (따옴표 포함). */
  function buildDialogueMap(text) {
    const map = new Uint8Array(text.length);
    let straightOpen = -1;
    let curlyOpen = -1;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '"') {
        if (straightOpen < 0) {
          straightOpen = i;
        } else {
          map.fill(1, straightOpen, i + 1);
          straightOpen = -1;
        }
      } else if (ch === "“") {
        curlyOpen = i;
      } else if (ch === "”" && curlyOpen >= 0) {
        map.fill(1, curlyOpen, i + 1);
        curlyOpen = -1;
      }
    }
    return map;
  }

  function roundedPath(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x, y, w, h, rr);
      return;
    }
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  // ──────────────────────────────────────────────
  // 질감 타일
  // ──────────────────────────────────────────────
  const grainCache = {};
  function grainTile(base, dark, light) {
    const key = `${base}|${dark}|${light}`;
    if (grainCache[key]) return grainCache[key];
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d");
    g.fillStyle = base;
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2200; i++) {
      const a = Math.random() * dark;
      if (a <= 0) break;
      g.fillStyle = `rgba(40,30,10,${a.toFixed(3)})`;
      g.fillRect(Math.random() * 256, Math.random() * 256, 1.4, 1.4);
    }
    for (let i = 0; i < 1400; i++) {
      const a = Math.random() * light;
      if (a <= 0) break;
      g.fillStyle = `rgba(255,252,240,${a.toFixed(3)})`;
      g.fillRect(Math.random() * 256, Math.random() * 256, 1.4, 1.4);
    }
    grainCache[key] = c;
    return c;
  }
  function grainSpecFor() {
    const spec = state.bg.mode === "texture" ? TEXTURES[state.bg.texture] : null;
    return { dark: spec ? spec.grainDark : 0.035, light: spec ? spec.grainLight : 0.04 };
  }

  // ──────────────────────────────────────────────
  // 리디바탕 웹폰트
  // ──────────────────────────────────────────────
  function pageHasFamily(family) {
    let found = false;
    try {
      document.fonts.forEach((f) => {
        if (String(f.family).replace(/^["']|["']$/g, "") === family) found = true;
      });
    } catch {
      /* 무시 */
    }
    return found;
  }

  const webfontLoads = {};
  function ensureWebfont(key) {
    const def = WEBFONTS[key];
    if (!def) return Promise.resolve(false);
    if (pageHasFamily(def.family)) return Promise.resolve(true);
    if (!webfontLoads[key]) {
      webfontLoads[key] = (async () => {
        let buffer = null;
        try {
          const res = await fetch(def.url, { mode: "cors" });
          if (res.ok) buffer = await res.arrayBuffer();
        } catch {
          /* 페이지 CSP가 막은 경우 — 백그라운드에 위임 */
        }
        if (!buffer && typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
          const resp = await chrome.runtime.sendMessage({ type: "bs-fetch-font", url: def.url });
          if (!resp || !resp.ok) throw new Error(resp ? resp.error : "no response");
          const bin = atob(resp.data);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          buffer = bytes.buffer;
        }
        if (!buffer) throw new Error("font fetch failed");
        const face = new FontFace(def.family, buffer);
        await face.loaded;
        document.fonts.add(face);
        return true;
      })().catch((err) => {
        webfontLoads[key] = null;
        throw err;
      });
    }
    return webfontLoads[key];
  }

  function resolvedFontFamily() {
    if (state.fontFamily) return state.fontFamily;
    try {
      const pageFont = getComputedStyle(document.body).fontFamily;
      if (pageFont) return pageFont;
    } catch {
      /* 무시 */
    }
    return FONT_FALLBACK;
  }

  // ──────────────────────────────────────────────
  // 페이지 메타데이터 → 플랫폼 이름
  // ──────────────────────────────────────────────
  function detectSiteName() {
    const read = (key) => {
      const node = document.querySelector(`meta[property="${key}"], meta[name="${key}"]`);
      const content = node && node.getAttribute("content");
      return content ? content.trim() : "";
    };
    let site = read("og:site_name") || read("application-name");
    if (!site) {
      site = location.hostname.replace(/^www\./, "").split(".")[0].toUpperCase();
    }
    return site;
  }

  // ──────────────────────────────────────────────
  // 치환 (글자별 원문 위치를 추적해 마크를 보존한다)
  // ──────────────────────────────────────────────
  let currentAnnotation = null;

  function annotateReplaced(base, rules) {
    // UTF-16 코드 유닛 단위로 쪼갠다. 마크 위치·토큰 index·startsWith가 모두 코드 유닛 기준이라
    // Array.from(코드 포인트 단위)을 쓰면 이모지 뒤부터 위치가 어긋난다.
    let chars = Array.from({ length: base.length }, (_, i) => ({ ch: base[i], bs: i, be: i + 1 }));
    for (const rule of rules) {
      if (!rule.find) continue;
      const find = rule.find;
      const str = chars.map((c) => c.ch).join("");
      const out = [];
      let i = 0;
      while (i < chars.length) {
        if (str.startsWith(find, i)) {
          const bs = chars[i].bs;
          const be = chars[i + find.length - 1].be;
          for (let k = 0; k < rule.replace.length; k++) out.push({ ch: rule.replace[k], bs, be });
          i += find.length;
        } else {
          out.push(chars[i]);
          i += 1;
        }
      }
      chars = out;
    }
    return chars;
  }

  function applyRulesWithAnnotation() {
    currentAnnotation = annotateReplaced(state.baseText, state.replaceRules);
    state.text = currentAnnotation.map((c) => c.ch).join("");
  }

  function remapMarks(marks, oldAnn, newAnn) {
    const result = [];
    for (const mk of marks) {
      if (mk.end <= mk.start || mk.start >= oldAnn.length) continue;
      const baseStart = oldAnn[mk.start].bs;
      const baseEnd = oldAnn[Math.min(mk.end, oldAnn.length) - 1].be;
      let s = -1;
      let e = -1;
      for (let j = 0; j < newAnn.length; j++) {
        if (s < 0 && newAnn[j].be > baseStart) s = j;
        if (newAnn[j].bs < baseEnd) e = j;
      }
      if (s < 0 || e < s) continue;
      result.push({ start: s, end: e + 1, type: mk.type });
    }
    result.sort((a, b) => a.start - b.start);
    const cleaned = [];
    for (const mk of result) {
      const last = cleaned[cleaned.length - 1];
      if (last && mk.start < last.end) {
        if (mk.type === last.type) {
          last.end = Math.max(last.end, mk.end);
          continue;
        }
        mk.start = last.end;
        if (mk.start >= mk.end) continue;
      }
      cleaned.push(mk);
    }
    return cleaned;
  }

  // ──────────────────────────────────────────────
  // 마크 구간 연산
  // ──────────────────────────────────────────────
  function applyMark(start, end, type) {
    if (end <= start) return;
    const next = [];
    for (const m of state.marks) {
      if (m.end <= start || m.start >= end) {
        next.push(m);
        continue;
      }
      if (m.start < start) next.push({ start: m.start, end: start, type: m.type });
      if (m.end > end) next.push({ start: end, end: m.end, type: m.type });
    }
    if (type) next.push({ start, end, type });
    next.sort((a, b) => a.start - b.start);
    const merged = [];
    for (const m of next) {
      const last = merged[merged.length - 1];
      if (last && last.type === m.type && last.end === m.start) last.end = m.end;
      else merged.push({ ...m });
    }
    state.marks = merged;
  }
  function markAt(index) {
    for (const m of state.marks) {
      if (index >= m.start && index < m.end) return m.type;
    }
    return null;
  }

  // ──────────────────────────────────────────────
  // Shadow DOM 호스트 (페이지 CSS와 격리)
  // ──────────────────────────────────────────────
  let shadowRoot = null;
  function ensureShadow() {
    if (shadowRoot) return shadowRoot;
    const host = document.createElement("div");
    host.id = "balche-studio-host";
    shadowRoot = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = window.__BALCHE_CSS || "";
    shadowRoot.appendChild(style);
    document.documentElement.appendChild(host);
    return shadowRoot;
  }
  function activeSelection() {
    if (shadowRoot && typeof shadowRoot.getSelection === "function") return shadowRoot.getSelection();
    return window.getSelection();
  }

  // ──────────────────────────────────────────────
  // 편집 팝업
  // ──────────────────────────────────────────────
  let modalOpen = false;
  let overlay = null;
  let previewCard = null;
  let previewBodyWrap = null;
  let previewText = null;
  let previewFooter = null;
  let statusLine = null;
  let rulesBox = null;
  let pasteBox = null;

  function escToClose(e) {
    if (e.key === "Escape" && modalOpen) {
      e.stopPropagation();
      closeModal();
    }
  }

  function closeModal() {
    if (!modalOpen) return;
    modalOpen = false;
    savePrefs();
    document.removeEventListener("keydown", escToClose, true);
    if (overlay) overlay.remove();
    overlay = previewCard = previewBodyWrap = previewText = previewFooter = statusLine = rulesBox = pasteBox = null;
  }

  function setStatus(message) {
    if (statusLine) statusLine.textContent = message;
  }

  let openSeq = 0;
  async function openModal(initialText) {
    if (modalOpen) closeModal();
    // 설정을 읽는 동안은 아직 "열림"이 아니다. 그 사이 다시 호출되면(툴바 연타) 이전 호출은 조용히 물러난다.
    // (전에는 읽기 전에 modalOpen=true를 두어, 연타 시 기본값으로 savePrefs가 실행돼 저장된 설정이 날아가고
    //  오버레이가 두 장 생겨 첫 장은 닫히지 않았다)
    const seq = ++openSeq;
    const prefs = await storageGet();
    if (seq !== openSeq || modalOpen) return;
    modalOpen = true;

    state.baseText = "";
    state.text = "";
    state.marks = [];
    state.bg.imageData = null;
    state.bg.dim = 0;
    state.bg.bright = 0;
    loadPrefsFrom(prefs);
    if (state.bg.mode === "texture") state.textColor = TEXTURES[state.bg.texture].text;

    state.titleText = "";
    state.authorText = detectSiteName();

    const root = ensureShadow();
    overlay = el("div", "bs-overlay");
    const panel = el("div", "bs-panel");
    panel.style.backgroundImage = `url("${grainTile("#FBFBFA", 0.02, 0).toDataURL("image/png")}")`;
    overlay.appendChild(panel);

    // ── 헤더
    const header = el("div", "bs-header");
    const headerLeft = el("div", "bs-header-left");
    headerLeft.appendChild(el("div", "bs-title", "발췌 스튜디오"));
    headerLeft.appendChild(el("div", "bs-subtitle", "EXCERPT STUDIO"));
    header.appendChild(headerLeft);
    const closeBtn = el("button", "bs-icon-btn", "✕");
    closeBtn.type = "button";
    closeBtn.title = "닫기";
    closeBtn.addEventListener("click", closeModal);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    // ── 본문
    const body = el("div", "bs-body");
    panel.appendChild(body);

    const previewWrap = el("div", "bs-preview-wrap");
    previewCard = el("div", "bs-card");
    previewBodyWrap = el("div", "bs-card-body");
    previewText = el("div", "bs-card-text");
    previewBodyWrap.appendChild(previewText);
    previewFooter = el("div", "bs-card-footer");
    previewCard.appendChild(previewBodyWrap);
    previewCard.appendChild(previewFooter);
    previewWrap.appendChild(previewCard);
    body.appendChild(previewWrap);

    // 붙여넣기 모드 (선택한 글이 없을 때)
    pasteBox = el("div", "bs-paste");
    pasteBox.appendChild(el("div", "bs-paste-hint", "드래그로 선택한 글이 없어요.\n발췌할 글을 아래에 붙여넣어 주세요."));
    const pasteArea = el("textarea");
    pasteArea.placeholder = "여기에 붙여넣기 (Ctrl+V)";
    pasteBox.appendChild(pasteArea);
    const pasteBtn = el("button", "bs-btn bs-btn-primary", "이 글로 발췌 시작");
    pasteBtn.type = "button";
    pasteBtn.style.alignSelf = "center";
    pasteBtn.addEventListener("click", () => {
      const text = pasteArea.value.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
      if (!text) {
        setStatus("붙여넣은 글이 비어 있어요.");
        return;
      }
      pasteBox.style.display = "none";
      previewCard.style.display = "";
      startWithText(text);
    });
    pasteBox.appendChild(pasteBtn);
    previewWrap.appendChild(pasteBox);

    const controls = el("div", "bs-controls");
    body.appendChild(controls);

    // ══ 글자 ══════════════════════════════════
    controls.appendChild(el("div", "bs-section-title", "글자"));

    controls.appendChild(
      numericControl({
        label: "크기",
        min: 12,
        max: 44,
        step: 1,
        value: state.fontSize,
        onChange: (v) => {
          state.fontSize = v;
          renderPreview();
        },
      }),
    );

    const customStack = (name) => `"${name.replaceAll('"', "")}", ${FONT_FALLBACK}`;
    const isCustomActive = () => !!state.customFont && state.fontFamily === customStack(state.customFont);

    const fontRow = el("div", "bs-row");
    fontRow.appendChild(el("label", "bs-label", "폰트"));
    const fontSelect = el("select", "bs-select");
    for (const f of BUILTIN_FONTS) {
      const opt = el("option", null, f.label);
      opt.value = f.value;
      if (f.webfont) opt.dataset.webfont = f.webfont;
      if (f.value === state.fontFamily || (f.value === CUSTOM_FONT_VALUE && isCustomActive())) opt.selected = true;
      fontSelect.appendChild(opt);
    }
    fontRow.appendChild(fontSelect);
    controls.appendChild(fontRow);

    // 기기 폰트 직접 입력 줄 (직접 입력을 고르면 나타난다)
    const customFontRow = el("div", "bs-row");
    customFontRow.appendChild(el("label", "bs-label", "폰트명"));
    const customFontInput = el("input", "bs-input");
    customFontInput.type = "text";
    customFontInput.placeholder = "기기에 설치된 폰트 이름 (예: KoPubWorld돋움체)";
    customFontInput.value = state.customFont;
    customFontRow.appendChild(customFontInput);
    customFontRow.style.display = isCustomActive() ? "" : "none";
    controls.appendChild(customFontRow);

    const renderCustomFontSoon = debounce(() => renderPreview(), 250);
    customFontInput.addEventListener("input", () => {
      state.customFont = customFontInput.value.trim();
      state.fontFamily = state.customFont ? customStack(state.customFont) : "";
      renderCustomFontSoon();
    });

    fontSelect.addEventListener("change", () => {
      const opt = fontSelect.selectedOptions[0];
      if (fontSelect.value === CUSTOM_FONT_VALUE) {
        customFontRow.style.display = "";
        state.fontFamily = state.customFont ? customStack(state.customFont) : "";
        customFontInput.focus();
      } else {
        customFontRow.style.display = "none";
        state.fontFamily = fontSelect.value;
        if (opt && opt.dataset.webfont) {
          setStatus(`${opt.textContent} 폰트를 불러오는 중…`);
          ensureWebfont(opt.dataset.webfont)
            .then(() => {
              setStatus("");
              renderPreview();
            })
            .catch(() => setStatus("폰트를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요."));
        }
      }
      renderPreview();
    });

    const colorRow = el("div", "bs-row");
    colorRow.appendChild(el("label", "bs-label", "글자색"));
    const textColorInput = el("input", "bs-color");
    textColorInput.type = "color";
    textColorInput.value = state.textColor;
    textColorInput.addEventListener("input", () => {
      state.textColor = textColorInput.value;
      renderPreview();
    });
    colorRow.appendChild(textColorInput);
    const dlgCheck = el("input");
    dlgCheck.type = "checkbox";
    dlgCheck.className = "bs-check bs-push";
    dlgCheck.checked = state.dialogueEnabled;
    dlgCheck.title = "대사 색상 켜기/끄기";
    const dlgLabel = el("label", "bs-label bs-label-auto", "대사 색상");
    const dlgColorInput = el("input", "bs-color");
    dlgColorInput.type = "color";
    dlgColorInput.value = state.dialogueColor;
    dlgCheck.addEventListener("change", () => {
      state.dialogueEnabled = dlgCheck.checked;
      renderPreview();
    });
    dlgColorInput.addEventListener("input", () => {
      state.dialogueColor = dlgColorInput.value;
      if (!state.dialogueEnabled) {
        state.dialogueEnabled = true;
        dlgCheck.checked = true;
      }
      renderPreview();
    });
    colorRow.appendChild(dlgCheck);
    colorRow.appendChild(dlgLabel);
    colorRow.appendChild(dlgColorInput);
    controls.appendChild(colorRow);

    const alignRow = el("div", "bs-seg");
    const aligns = [
      ["left", "왼쪽"],
      ["center", "가운데"],
      ["right", "오른쪽"],
      ["justify", "양쪽"],
    ];
    const alignBtns = {};
    for (const [value, label] of aligns) {
      const b = el("button", "bs-seg-btn", label);
      b.type = "button";
      if (state.align === value) b.classList.add("bs-active");
      b.addEventListener("click", () => {
        state.align = value;
        for (const key of Object.keys(alignBtns)) alignBtns[key].classList.toggle("bs-active", key === value);
        renderPreview();
      });
      alignBtns[value] = b;
      alignRow.appendChild(b);
    }
    controls.appendChild(alignRow);

    // ══ 형광펜 · 밑줄 · 검열 ═══════════════════
    controls.appendChild(el("div", "bs-section-title", "형광펜 · 밑줄 · 검열"));
    controls.appendChild(el("div", "bs-hint", "글자 드래그 후 색상 선택"));

    let markMode = "hl";
    const modeRow = el("div", "bs-seg");
    const modeBtns = {};
    const colorSwatches = [];
    function updateSwatchLook() {
      for (const { key, btn } of colorSwatches) {
        if (markMode === "hl") {
          btn.style.background = HIGHLIGHTS[key].color;
          btn.style.borderBottom = "";
          btn.title = `형광펜 (${HIGHLIGHTS[key].label})`;
        } else {
          btn.style.background = "#ffffff";
          btn.style.borderBottom = `5px solid ${UNDERLINES[`u${key}`].color}`;
          btn.title = `밑줄 (${HIGHLIGHTS[key].label})`;
        }
      }
    }
    for (const [value, label] of [
      ["hl", "형광펜"],
      ["ul", "밑줄"],
    ]) {
      const b = el("button", "bs-seg-btn", label);
      b.type = "button";
      if (markMode === value) b.classList.add("bs-active");
      b.addEventListener("mousedown", (e) => e.preventDefault());
      b.addEventListener("click", () => {
        markMode = value;
        for (const key of Object.keys(modeBtns)) modeBtns[key].classList.toggle("bs-active", key === value);
        updateSwatchLook();
      });
      modeBtns[value] = b;
      modeRow.appendChild(b);
    }
    controls.appendChild(modeRow);

    const markRow = el("div", "bs-mark-row");
    for (const key of Object.keys(HIGHLIGHTS)) {
      const b = el("button", "bs-swatch");
      b.type = "button";
      b.addEventListener("mousedown", (e) => e.preventDefault());
      b.addEventListener("click", () => markSelection(markMode === "hl" ? key : `u${key}`));
      colorSwatches.push({ key, btn: b });
      markRow.appendChild(b);
    }
    updateSwatchLook();
    const censorBtn = el("button", "bs-swatch bs-swatch-censor", "가");
    censorBtn.type = "button";
    censorBtn.title = "검열 (검은 마크)";
    censorBtn.addEventListener("mousedown", (e) => e.preventDefault());
    censorBtn.addEventListener("click", () => markSelection(CENSOR));
    markRow.appendChild(censorBtn);
    const eraseBtn = el("button", "bs-swatch bs-swatch-erase", "지움");
    eraseBtn.type = "button";
    eraseBtn.title = "마크 지우기";
    eraseBtn.addEventListener("mousedown", (e) => e.preventDefault());
    eraseBtn.addEventListener("click", () => markSelection(null));
    markRow.appendChild(eraseBtn);
    controls.appendChild(markRow);

    // ══ 치환 ═══════════════════════════════════
    controls.appendChild(el("div", "bs-section-title", "치환"));
    rulesBox = el("div", "bs-rules");
    controls.appendChild(rulesBox);
    const addRuleBtn = el("button", "bs-btn bs-btn-slim", "+ 치환 규칙 추가");
    addRuleBtn.type = "button";
    addRuleBtn.addEventListener("click", () => {
      state.replaceRules.push({ find: "", replace: "" });
      renderRules();
    });
    controls.appendChild(addRuleBtn);

    const onRulesChanged = debounce(() => {
      if (!state.baseText) return;
      const before = state.marks.length;
      const oldAnnotation = currentAnnotation;
      applyRulesWithAnnotation();
      state.marks = remapMarks(state.marks, oldAnnotation, currentAnnotation);
      renderPreview();
      if (state.marks.length < before) setStatus("치환으로 일부 마크가 사라졌습니다.");
      else setStatus("");
    }, 250);

    function renderRules() {
      rulesBox.textContent = "";
      state.replaceRules.forEach((rule, index) => {
        const row = el("div", "bs-rule-row");
        const findInput = el("input", "bs-input");
        findInput.type = "text";
        findInput.placeholder = "찾기";
        findInput.value = rule.find;
        findInput.addEventListener("input", () => {
          rule.find = findInput.value;
          onRulesChanged();
        });
        const arrow = el("span", "bs-rule-arrow", "→");
        const replaceInput = el("input", "bs-input");
        replaceInput.type = "text";
        replaceInput.placeholder = "바꾸기";
        replaceInput.value = rule.replace;
        replaceInput.addEventListener("input", () => {
          rule.replace = replaceInput.value;
          onRulesChanged();
        });
        const removeBtn = el("button", "bs-rule-remove", "✕");
        removeBtn.type = "button";
        removeBtn.title = "규칙 삭제";
        removeBtn.addEventListener("click", () => {
          state.replaceRules.splice(index, 1);
          renderRules();
          onRulesChanged();
        });
        row.appendChild(findInput);
        row.appendChild(arrow);
        row.appendChild(replaceInput);
        row.appendChild(removeBtn);
        rulesBox.appendChild(row);
      });
    }
    renderRules();

    // ══ 작품 정보 ══════════════════════════════
    controls.appendChild(el("div", "bs-section-title", "작품 정보"));

    const titleRow = el("div", "bs-check-row");
    const titleCheck = el("input");
    titleCheck.type = "checkbox";
    titleCheck.className = "bs-check";
    titleCheck.checked = state.showTitle;
    const titleInput = el("input", "bs-input");
    titleInput.type = "text";
    titleInput.placeholder = "캐릭터 이름";
    titleInput.value = state.titleText;
    titleCheck.addEventListener("change", () => {
      state.showTitle = titleCheck.checked;
      renderPreview();
    });
    const renderTitleSoon = debounce(() => renderPreview(), 200);
    titleInput.addEventListener("input", () => {
      state.titleText = titleInput.value; // 상태는 즉시 반영 (닫기 직전 입력이 저장에서 빠지지 않도록)
      renderTitleSoon();
    });
    titleRow.appendChild(titleCheck);
    titleRow.appendChild(titleInput);
    controls.appendChild(titleRow);

    const authorRow = el("div", "bs-check-row");
    const authorCheck = el("input");
    authorCheck.type = "checkbox";
    authorCheck.className = "bs-check";
    authorCheck.checked = state.showAuthor;
    const authorInput = el("input", "bs-input");
    authorInput.type = "text";
    authorInput.placeholder = "플랫폼 (사이트 이름)";
    authorInput.value = state.authorText;
    authorCheck.addEventListener("change", () => {
      state.showAuthor = authorCheck.checked;
      renderPreview();
    });
    const renderAuthorSoon = debounce(() => renderPreview(), 200);
    authorInput.addEventListener("input", () => {
      state.authorText = authorInput.value;
      renderAuthorSoon();
    });
    authorRow.appendChild(authorCheck);
    authorRow.appendChild(authorInput);
    controls.appendChild(authorRow);

    // ══ 배경 ═══════════════════════════════════
    controls.appendChild(el("div", "bs-section-title", "배경"));

    const texRow = el("div", "bs-tex-row");
    for (const [key, spec] of Object.entries(TEXTURES)) {
      const b = el("button", "bs-tex-btn", spec.label);
      b.type = "button";
      b.style.background = spec.base;
      b.style.color = spec.text;
      b.addEventListener("click", () => {
        state.bg.mode = "texture";
        state.bg.texture = key;
        state.textColor = spec.text;
        textColorInput.value = spec.text;
        renderPreview();
      });
      texRow.appendChild(b);
    }
    controls.appendChild(texRow);

    const bgRow = el("div", "bs-row");
    bgRow.appendChild(el("label", "bs-label", "단색"));
    const bgColorInput = el("input", "bs-color");
    bgColorInput.type = "color";
    bgColorInput.value = state.bg.color;
    bgColorInput.addEventListener("input", () => {
      state.bg.mode = "solid";
      state.bg.color = bgColorInput.value;
      renderPreview();
    });
    bgRow.appendChild(bgColorInput);
    const fileBtn = el("button", "bs-btn bs-btn-slim bs-push", "이미지 불러오기");
    fileBtn.type = "button";
    const fileInput = el("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.style.display = "none";
    fileBtn.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          state.bg.mode = "image";
          state.bg.imageData = img;
          renderPreview();
        };
        img.onerror = () => setStatus("이미지 파일을 읽지 못했습니다.");
        img.src = String(reader.result);
      };
      reader.onerror = () => setStatus("이미지 파일을 읽지 못했습니다.");
      reader.readAsDataURL(file);
      fileInput.value = "";
    });
    bgRow.appendChild(fileBtn);
    bgRow.appendChild(fileInput);
    controls.appendChild(bgRow);

    // 무늬 선택
    const patternRow = el("div", "bs-seg");
    const patterns = [
      ["grain", "종이 질감"],
      ["lines", "줄노트"],
      ["grid", "모눈"],
      ["none", "없음"],
    ];
    const patternBtns = {};
    for (const [value, label] of patterns) {
      const b = el("button", "bs-seg-btn", label);
      b.type = "button";
      if (state.bg.pattern === value) b.classList.add("bs-active");
      b.addEventListener("click", () => {
        state.bg.pattern = value;
        for (const key of Object.keys(patternBtns)) patternBtns[key].classList.toggle("bs-active", key === value);
        if (state.bg.mode === "image") state.bg.mode = "texture";
        renderPreview();
      });
      patternBtns[value] = b;
      patternRow.appendChild(b);
    }
    controls.appendChild(patternRow);

    controls.appendChild(
      numericControl({
        label: "어둡게",
        min: 0,
        max: 70,
        step: 1,
        value: 0,
        onChange: (v) => {
          state.bg.dim = v / 100;
          renderPreview();
        },
      }),
    );
    controls.appendChild(
      numericControl({
        label: "밝게",
        min: 0,
        max: 70,
        step: 1,
        value: 0,
        onChange: (v) => {
          state.bg.bright = v / 100;
          renderPreview();
        },
      }),
    );

    // ══ 카드 ═══════════════════════════════════
    controls.appendChild(el("div", "bs-section-title", "카드"));

    controls.appendChild(
      numericControl({
        label: "폭",
        min: 420,
        max: 1080,
        step: 20,
        value: state.cardWidth,
        onChange: (v) => {
          state.cardWidth = v;
          renderPreview();
        },
      }),
    );
    controls.appendChild(
      numericControl({
        label: "둥글기",
        min: 0,
        max: 60,
        step: 2,
        value: state.cornerRadius,
        onChange: (v) => {
          state.cornerRadius = v;
          renderPreview();
        },
      }),
    );

    const heightModeRow = el("div", "bs-seg");
    const heightModes = [
      ["auto", "높이 자동"],
      ["fixed", "높이 직접"],
    ];
    const heightModeBtns = {};
    const heightRow = numericControl({
      label: "높이",
      min: 360,
      max: 1800,
      step: 20,
      value: state.cardHeight,
      onChange: (v) => {
        state.cardHeight = v;
        renderPreview();
      },
    });
    const vAlignRow = el("div", "bs-seg");
    function syncHeightRows() {
      heightRow.style.display = state.heightMode === "fixed" ? "" : "none";
      vAlignRow.style.display = state.heightMode === "fixed" ? "" : "none";
    }
    for (const [value, label] of heightModes) {
      const b = el("button", "bs-seg-btn", label);
      b.type = "button";
      if (state.heightMode === value) b.classList.add("bs-active");
      b.addEventListener("click", () => {
        state.heightMode = value;
        for (const key of Object.keys(heightModeBtns)) heightModeBtns[key].classList.toggle("bs-active", key === value);
        syncHeightRows();
        renderPreview();
      });
      heightModeBtns[value] = b;
      heightModeRow.appendChild(b);
    }
    controls.appendChild(heightModeRow);
    controls.appendChild(heightRow);

    const vAligns = [
      ["top", "본문 위쪽"],
      ["center", "본문 가운데"],
    ];
    const vAlignBtns = {};
    for (const [value, label] of vAligns) {
      const b = el("button", "bs-seg-btn", label);
      b.type = "button";
      if (state.vAlign === value) b.classList.add("bs-active");
      b.addEventListener("click", () => {
        state.vAlign = value;
        for (const key of Object.keys(vAlignBtns)) vAlignBtns[key].classList.toggle("bs-active", key === value);
        renderPreview();
      });
      vAlignBtns[value] = b;
      vAlignRow.appendChild(b);
    }
    controls.appendChild(vAlignRow);
    syncHeightRows();

    // ── 푸터
    const footer = el("div", "bs-footer");
    statusLine = el("div", "bs-status", "");
    footer.appendChild(statusLine);
    const cancelBtn = el("button", "bs-btn", "닫기");
    cancelBtn.type = "button";
    cancelBtn.addEventListener("click", closeModal);
    footer.appendChild(cancelBtn);
    const saveBtn = el("button", "bs-btn bs-btn-primary", "PNG 저장");
    saveBtn.type = "button";
    saveBtn.addEventListener("click", () => {
      if (!state.text) {
        setStatus("먼저 발췌할 글을 넣어 주세요.");
        return;
      }
      exportPng().catch(() => setStatus("이미지 저장에 실패했습니다."));
    });
    footer.appendChild(saveBtn);
    panel.appendChild(footer);

    overlay.addEventListener("mousedown", (e) => {
      if (e.target === overlay) closeModal();
    });
    document.addEventListener("keydown", escToClose, true);
    root.appendChild(overlay);

    function startWithText(text) {
      state.baseText = text;
      applyRulesWithAnnotation();
      state.marks = [];
      renderPreview();
    }
    if (initialText) {
      pasteBox.style.display = "none";
      startWithText(initialText);
    } else {
      previewCard.style.display = "none";
      renderPreview();
      pasteArea.focus();
    }

    // 저장된 웹폰트 설정 복원
    const savedWebfont = BUILTIN_FONTS.find((f) => f.webfont && f.value === state.fontFamily);
    if (savedWebfont) {
      ensureWebfont(savedWebfont.webfont)
        .then(() => renderPreview())
        .catch(() => {});
    }
  }

  // ──────────────────────────────────────────────
  // 카드 지오메트리
  // ──────────────────────────────────────────────
  function cardMetrics() {
    const fontSize = state.fontSize;
    return {
      padding: Math.round(fontSize * 2.1),
      lineHeight: Math.round(fontSize * 1.75),
      titleSize: Math.max(13, Math.round(fontSize * 0.78)),
      authorSize: Math.max(10, Math.round(fontSize * 0.56)),
      gapAboveDivider: Math.round(fontSize * 1.7),
      gapTitle: Math.round(fontSize * 1.05),
      gapAuthor: Math.round(fontSize * 0.45),
    };
  }
  function effectiveFooter() {
    const title = state.showTitle && state.titleText.trim() ? state.titleText.trim() : null;
    const author = state.showAuthor && state.authorText.trim() ? state.authorText.trim() : null;
    return title || author ? { title, author } : null;
  }

  // ──────────────────────────────────────────────
  // 미리보기 렌더링
  // ──────────────────────────────────────────────
  function renderPreview() {
    if (!previewCard || !previewText) return;
    const m = cardMetrics();
    const family = resolvedFontFamily();

    previewCard.style.width = `${state.cardWidth}px`;
    previewCard.style.padding = `${m.padding}px`;
    previewCard.style.borderRadius = `${state.cornerRadius}px`;
    previewCard.style.minHeight = state.heightMode === "fixed" ? `${state.cardHeight}px` : "";
    previewBodyWrap.style.justifyContent =
      state.heightMode === "fixed" && state.vAlign === "center" ? "center" : "flex-start";
    previewBodyWrap.style.flex = state.heightMode === "fixed" ? "1" : "0 0 auto";

    if (state.bg.mode === "image" && state.bg.imageData) {
      previewCard.style.backgroundColor = "#000";
      previewCard.style.backgroundImage = `linear-gradient(rgba(0,0,0,${state.bg.dim}), rgba(0,0,0,${state.bg.dim})), linear-gradient(rgba(255,255,255,${state.bg.bright}), rgba(255,255,255,${state.bg.bright})), url("${state.bg.imageData.src}")`;
      previewCard.style.backgroundSize = "cover, cover, cover";
      previewCard.style.backgroundPosition = "center, center, center";
      previewCard.style.backgroundRepeat = "no-repeat, no-repeat, no-repeat";
    } else {
      const base = state.bg.mode === "solid" ? state.bg.color : TEXTURES[state.bg.texture].base;
      const patternInk = hexToRgba(state.textColor, 0.08);
      const layers = [];
      const sizes = [];
      const positions = [];
      const repeats = [];
      if (state.bg.pattern === "grain") {
        const g = grainSpecFor();
        layers.push(`url("${grainTile(base, g.dark, g.light).toDataURL("image/png")}")`);
        sizes.push("256px 256px");
        positions.push("0 0");
        repeats.push("repeat");
      } else if (state.bg.pattern === "grid") {
        layers.push(`repeating-linear-gradient(to right, ${patternInk} 0 1px, transparent 1px 24px)`);
        sizes.push("auto");
        positions.push("0 0");
        repeats.push("repeat");
        layers.push(`repeating-linear-gradient(to bottom, ${patternInk} 0 1px, transparent 1px 24px)`);
        sizes.push("auto");
        positions.push("0 0");
        repeats.push("repeat");
      } else if (state.bg.pattern === "lines") {
        const ruleOff = Math.round(m.lineHeight / 2 + state.fontSize * 0.71);
        layers.push(
          `repeating-linear-gradient(to bottom, transparent 0 ${m.lineHeight - 1}px, ${patternInk} ${m.lineHeight - 1}px ${m.lineHeight}px)`,
        );
        sizes.push("auto");
        positions.push(`0 ${m.padding + ruleOff - m.lineHeight + 1}px`);
        repeats.push("repeat");
      }
      previewCard.style.backgroundColor = base;
      previewCard.style.backgroundImage = layers.length ? layers.join(", ") : "none";
      previewCard.style.backgroundSize = sizes.join(", ");
      previewCard.style.backgroundPosition = positions.join(", ");
      previewCard.style.backgroundRepeat = repeats.join(", ");
    }

    previewText.style.fontFamily = family;
    previewText.style.fontSize = `${state.fontSize}px`;
    previewText.style.lineHeight = `${m.lineHeight}px`;
    previewText.style.textAlign = state.align;
    previewText.style.color = state.textColor;

    previewText.textContent = "";
    const dlgMap = state.dialogueEnabled ? buildDialogueMap(state.text) : null;
    const points = new Set([0, state.text.length]);
    for (const mk of state.marks) {
      points.add(mk.start);
      points.add(mk.end);
    }
    if (dlgMap) {
      for (let i = 1; i < dlgMap.length; i++) {
        if (dlgMap[i] !== dlgMap[i - 1]) points.add(i);
      }
      if (dlgMap.length > 0 && dlgMap[0]) points.add(0);
    }
    const sorted = [...points].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length - 1; i++) {
      const start = sorted[i];
      const end = sorted[i + 1];
      const chunk = state.text.slice(start, end);
      if (!chunk) continue;
      const type = markAt(start);
      const inDialogue = dlgMap ? dlgMap[start] === 1 : false;
      if (!type) {
        if (inDialogue) {
          const span = el("span");
          span.textContent = chunk;
          span.style.color = state.dialogueColor;
          previewText.appendChild(span);
        } else {
          previewText.appendChild(document.createTextNode(chunk));
        }
      } else {
        const span = el("span");
        span.textContent = chunk;
        if (type === CENSOR) {
          span.className = "bs-mark-censor";
        } else if (UNDERLINES[type]) {
          span.className = "bs-mark-ul";
          span.style.textDecorationColor = UNDERLINES[type].color;
          if (inDialogue) span.style.color = state.dialogueColor;
        } else {
          span.className = "bs-mark-hl";
          span.style.backgroundColor = HIGHLIGHTS[type].color;
        }
        previewText.appendChild(span);
      }
    }

    // 작품 정보 푸터
    previewFooter.textContent = "";
    const footerInfo = effectiveFooter();
    if (footerInfo) {
      const footerAlign = state.align === "justify" ? "left" : state.align;
      previewFooter.style.display = "";
      previewFooter.style.marginTop = `${m.gapAboveDivider}px`;
      previewFooter.style.borderTop = `1px solid ${hexToRgba(state.textColor, 0.22)}`;
      previewFooter.style.paddingTop = `${m.gapTitle}px`;
      previewFooter.style.textAlign = footerAlign;
      previewFooter.style.fontFamily = family;
      if (footerInfo.title) {
        const t = el("div", "bs-card-title", footerInfo.title);
        t.style.fontSize = `${m.titleSize}px`;
        t.style.color = state.textColor;
        previewFooter.appendChild(t);
      }
      if (footerInfo.author) {
        const a = el("div", "bs-card-author", footerInfo.author);
        a.style.fontSize = `${m.authorSize}px`;
        a.style.color = hexToRgba(state.textColor, 0.55);
        a.style.marginTop = footerInfo.title ? `${m.gapAuthor}px` : "0";
        previewFooter.appendChild(a);
      }
    } else {
      previewFooter.style.display = "none";
    }
  }

  // ──────────────────────────────────────────────
  // 미리보기 안 선택 → 마크 적용
  // ──────────────────────────────────────────────
  function previewSelectionOffsets() {
    if (!previewText) return null;
    const sel = activeSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
    const range = sel.getRangeAt(0);
    if (!previewText.contains(range.startContainer) || !previewText.contains(range.endContainer)) return null;
    const pre = range.cloneRange();
    pre.selectNodeContents(previewText);
    pre.setEnd(range.startContainer, range.startOffset);
    const start = pre.toString().length;
    const length = range.toString().length;
    if (length <= 0) return null;
    return { start, end: start + length };
  }

  function markSelection(type) {
    const offsets = previewSelectionOffsets();
    if (!offsets) {
      setStatus("먼저 미리보기에서 글자를 드래그하세요.");
      return;
    }
    applyMark(offsets.start, offsets.end, type);
    const sel = activeSelection();
    if (sel) sel.removeAllRanges();
    setStatus("");
    renderPreview();
  }

  // ──────────────────────────────────────────────
  // PNG 저장
  // ──────────────────────────────────────────────
  /** k 위치의 글자 하나. 서로게이트 쌍(이모지 등)은 두 코드 유닛을 한 글자로 돌려준다. */
  function glyphAt(str, k) {
    const cp = str.codePointAt(k);
    return cp > 0xffff ? str.slice(k, k + 2) : str[k];
  }

  function tokenizeParagraph(paragraph, baseIndex) {
    const tokens = [];
    let i = 0;
    while (i < paragraph.length) {
      const ch = paragraph[i];
      if (/\s/.test(ch)) {
        // NBSP·\r 같은 공백 문자도 공백 토큰으로 본다. 아래 단어 루프가 \s에서 멈추므로
        // 여기서 받지 않으면 빈 토큰만 쌓이고 i가 전진하지 않아 무한 루프에 빠진다.
        tokens.push({ kind: "space", text: " ", index: baseIndex + i });
        i += 1;
      } else if (CJK_RE.test(ch)) {
        tokens.push({ kind: "cjk", text: ch, index: baseIndex + i });
        i += 1;
      } else {
        let j = i;
        while (j < paragraph.length && !/\s/.test(paragraph[j]) && !CJK_RE.test(paragraph[j])) j += 1;
        tokens.push({ kind: "word", text: paragraph.slice(i, j), index: baseIndex + i });
        i = j;
      }
    }
    return tokens;
  }

  function layoutLines(ctx, maxWidth) {
    const widthOf = (text) => ctx.measureText(text).width;
    const lines = [];
    let cursor = 0;
    const paragraphs = state.text.split("\n");
    for (const paragraph of paragraphs) {
      const tokens = tokenizeParagraph(paragraph, cursor);
      let line = [];
      let lineWidth = 0;
      const pushLine = (isParagraphEnd) => {
        while (line.length && line[line.length - 1].kind === "space") {
          lineWidth -= line.pop().width;
        }
        lines.push({ tokens: line, width: lineWidth, paragraphEnd: isParagraphEnd });
        line = [];
        lineWidth = 0;
      };
      for (const token of tokens) {
        const w = widthOf(token.text);
        const entry = { ...token, width: w };
        if (token.kind === "space" && line.length === 0) continue;
        if (lineWidth + w > maxWidth && line.length > 0 && token.kind !== "space") {
          pushLine(false);
        }
        if (entry.width > maxWidth && entry.kind === "word") {
          let piece = "";
          let pieceStart = entry.index;
          for (let k = 0; k < entry.text.length; ) {
            const glyph = glyphAt(entry.text, k);
            const next = piece + glyph;
            if (widthOf(next) > maxWidth && piece) {
              const pw = widthOf(piece);
              if (lineWidth + pw > maxWidth && line.length > 0) pushLine(false);
              line.push({ kind: "word", text: piece, index: pieceStart, width: pw });
              lineWidth += pw;
              pushLine(false);
              piece = glyph;
              pieceStart = entry.index + k;
            } else {
              piece = next;
            }
            k += glyph.length;
          }
          if (piece) {
            const pw = widthOf(piece);
            if (lineWidth + pw > maxWidth && line.length > 0) pushLine(false);
            line.push({ kind: "word", text: piece, index: pieceStart, width: pw });
            lineWidth += pw;
          }
          continue;
        }
        line.push(entry);
        lineWidth += entry.width;
      }
      pushLine(true);
      cursor += paragraph.length + 1;
    }
    return lines;
  }

  function drawBackground(ctx, width, height) {
    if (state.bg.mode === "image" && state.bg.imageData) {
      const img = state.bg.imageData;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, width, height);
      const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      ctx.drawImage(img, (width - dw) / 2, (height - dh) / 2, dw, dh);
      if (state.bg.bright > 0) {
        ctx.fillStyle = `rgba(255,255,255,${state.bg.bright})`;
        ctx.fillRect(0, 0, width, height);
      }
      if (state.bg.dim > 0) {
        ctx.fillStyle = `rgba(0,0,0,${state.bg.dim})`;
        ctx.fillRect(0, 0, width, height);
      }
      return;
    }
    const m = cardMetrics();
    const base = state.bg.mode === "solid" ? state.bg.color : TEXTURES[state.bg.texture].base;
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, width, height);
    const patternInk = hexToRgba(state.textColor, 0.08);
    if (state.bg.pattern === "grain") {
      const g = grainSpecFor();
      const pattern = ctx.createPattern(grainTile(base, g.dark, g.light), "repeat");
      if (pattern) {
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, width, height);
      }
    } else if (state.bg.pattern === "grid") {
      ctx.fillStyle = patternInk;
      for (let gx = 0; gx <= width; gx += 24) ctx.fillRect(gx, 0, 1, height);
      for (let gy = 0; gy <= height; gy += 24) ctx.fillRect(0, gy, width, 1);
    } else if (state.bg.pattern === "lines") {
      ctx.fillStyle = patternInk;
      const ruleOff = Math.round(m.lineHeight / 2 + state.fontSize * 0.71);
      for (let ly = m.padding + ruleOff; ly < height - 4; ly += m.lineHeight) {
        ctx.fillRect(0, ly, width, 1);
      }
    }
  }

  async function exportPng() {
    setStatus("이미지를 만드는 중…");
    const family = resolvedFontFamily();
    const m = cardMetrics();
    try {
      const sample = `${state.text}${state.titleText}${state.authorText}발췌`;
      await document.fonts.load(`${state.fontSize}px ${family}`, sample);
      await document.fonts.load(`700 ${m.titleSize}px ${family}`, sample);
      await document.fonts.ready;
    } catch {
      /* 폰트 로드 실패 시 폴백으로 진행 */
    }

    const scale = 2;
    const contentWidth = state.cardWidth - m.padding * 2;
    const measure = document.createElement("canvas").getContext("2d");
    measure.font = `${state.fontSize}px ${family}`;
    const lines = layoutLines(measure, contentWidth);
    const bodyHeight = Math.max(1, lines.length) * m.lineHeight;

    const footerInfo = effectiveFooter();
    let footerHeight = 0;
    if (footerInfo) {
      footerHeight = m.gapAboveDivider + 1 + m.gapTitle;
      if (footerInfo.title) footerHeight += Math.round(m.titleSize * 1.3);
      if (footerInfo.author) footerHeight += (footerInfo.title ? m.gapAuthor : 0) + Math.round(m.authorSize * 1.4);
    }

    const autoHeight = m.padding * 2 + bodyHeight + footerHeight;
    const cardHeight = state.heightMode === "fixed" ? Math.max(state.cardHeight, autoHeight) : autoHeight;
    const bodyAreaHeight = cardHeight - m.padding * 2 - footerHeight;
    const bodyOffset =
      state.heightMode === "fixed" && state.vAlign === "center" ? Math.max(0, (bodyAreaHeight - bodyHeight) / 2) : 0;

    const canvas = document.createElement("canvas");
    canvas.width = state.cardWidth * scale;
    canvas.height = cardHeight * scale;
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);

    if (state.cornerRadius > 0) {
      roundedPath(ctx, 0, 0, state.cardWidth, cardHeight, state.cornerRadius);
      ctx.clip();
    }

    drawBackground(ctx, state.cardWidth, cardHeight);

    ctx.font = `${state.fontSize}px ${family}`;
    ctx.textBaseline = "alphabetic";
    const metrics = measure.measureText("한Ag");
    const ascent = metrics.fontBoundingBoxAscent || state.fontSize * 0.82;
    const descent = metrics.fontBoundingBoxDescent || state.fontSize * 0.22;

    const dlgMap = state.dialogueEnabled ? buildDialogueMap(state.text) : null;
    const inkFor = (i) => {
      const t = markAt(i);
      if (t && HIGHLIGHTS[t]) return INK;
      return dlgMap && dlgMap[i] ? state.dialogueColor : state.textColor;
    };

    lines.forEach((line, lineIndex) => {
      const baseline = m.padding + bodyOffset + lineIndex * m.lineHeight + (m.lineHeight + ascent - descent) / 2;
      let startX = m.padding;
      let spaceExtra = 0;
      const spaceCount = line.tokens.filter((t) => t.kind === "space").length;
      if (state.align === "center") startX = m.padding + (contentWidth - line.width) / 2;
      else if (state.align === "right") startX = m.padding + contentWidth - line.width;
      else if (state.align === "justify" && !line.paragraphEnd && spaceCount > 0) {
        spaceExtra = (contentWidth - line.width) / spaceCount;
      }

      // 1차: 형광펜/검열 사각형 + 밑줄 (밑줄은 이어진 구간 단위)
      const ulY = baseline + state.fontSize * 0.18 + 3;
      const ulThick = Math.max(1.5, state.fontSize * 0.1);
      let ulRun = null;
      const flushUl = () => {
        if (!ulRun) return;
        ctx.fillStyle = ulRun.color;
        ctx.fillRect(ulRun.x1, ulY, ulRun.x2 - ulRun.x1, ulThick);
        ulRun = null;
      };
      let x = startX;
      for (const token of line.tokens) {
        const tokenWidth = token.width + (token.kind === "space" ? spaceExtra : 0);
        let cx = x;
        for (let k = 0; k < token.text.length; ) {
          const glyph = glyphAt(token.text, k);
          const chWidth = token.text.length === glyph.length ? tokenWidth : measure.measureText(glyph).width;
          const type = markAt(token.index + k);
          if (type === CENSOR) {
            flushUl();
            ctx.fillStyle = "#111111";
            ctx.fillRect(cx - 0.5, baseline - ascent - 1, chWidth + 1, ascent + descent + 2);
          } else if (type && HIGHLIGHTS[type]) {
            flushUl();
            ctx.fillStyle = HIGHLIGHTS[type].color;
            ctx.fillRect(cx - 0.5, baseline - ascent - 3, chWidth + 1, ascent + descent + 6);
          } else if (type && UNDERLINES[type]) {
            const color = UNDERLINES[type].color;
            if (ulRun && ulRun.color === color) ulRun.x2 = cx + chWidth;
            else {
              flushUl();
              ulRun = { color, x1: cx, x2: cx + chWidth };
            }
          } else {
            flushUl();
          }
          cx += chWidth;
          k += glyph.length;
        }
        x += tokenWidth;
      }
      flushUl();

      // 2차: 글자 (검열 구간은 비우고, 형광펜 위 글자는 잉크색)
      x = startX;
      for (const token of line.tokens) {
        const tokenWidth = token.width + (token.kind === "space" ? spaceExtra : 0);
        if (token.kind !== "space") {
          let uniform = true;
          for (let k = 1; k < token.text.length; k++) {
            if (
              markAt(token.index + k) !== markAt(token.index) ||
              inkFor(token.index + k) !== inkFor(token.index)
            ) {
              uniform = false;
              break;
            }
          }
          if (uniform) {
            if (markAt(token.index) !== CENSOR) {
              ctx.fillStyle = inkFor(token.index);
              ctx.fillText(token.text, x, baseline);
            }
          } else {
            let cx = x;
            for (let k = 0; k < token.text.length; ) {
              const glyph = glyphAt(token.text, k);
              const chWidth = measure.measureText(glyph).width;
              if (markAt(token.index + k) !== CENSOR) {
                ctx.fillStyle = inkFor(token.index + k);
                ctx.fillText(glyph, cx, baseline);
              }
              cx += chWidth;
              k += glyph.length;
            }
          }
        }
        x += tokenWidth;
      }
    });

    // 작품 정보 푸터
    if (footerInfo) {
      const footerAlign = state.align === "justify" ? "left" : state.align;
      const alignX = (w) =>
        footerAlign === "center"
          ? m.padding + (contentWidth - w) / 2
          : footerAlign === "right"
            ? m.padding + contentWidth - w
            : m.padding;

      let y = m.padding + bodyAreaHeight + m.gapAboveDivider;
      ctx.fillStyle = hexToRgba(state.textColor, 0.22);
      ctx.fillRect(m.padding, y, contentWidth, 1);
      y += 1 + m.gapTitle;

      if (footerInfo.title) {
        ctx.font = `700 ${m.titleSize}px ${family}`;
        let title = footerInfo.title;
        if (ctx.measureText(title).width > contentWidth) {
          while (title.length > 1 && ctx.measureText(`${title}…`).width > contentWidth) title = title.slice(0, -1);
          title = `${title}…`;
        }
        ctx.fillStyle = state.textColor;
        ctx.fillText(title, alignX(ctx.measureText(title).width), y + m.titleSize);
        y += Math.round(m.titleSize * 1.3) + m.gapAuthor;
      }
      if (footerInfo.author) {
        ctx.font = `500 ${m.authorSize}px ${family}`;
        try {
          ctx.letterSpacing = `${Math.round(m.authorSize * 0.18)}px`;
        } catch {
          /* 미지원 */
        }
        ctx.fillStyle = hexToRgba(state.textColor, 0.55);
        ctx.fillText(footerInfo.author, alignX(ctx.measureText(footerInfo.author).width), y + m.authorSize);
        try {
          ctx.letterSpacing = "0px";
        } catch {
          /* 무시 */
        }
      }
    }

    await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("toBlob 실패"));
          return;
        }
        const stamp = new Date();
        const pad2 = (n) => String(n).padStart(2, "0");
        const name = `발췌_${stamp.getFullYear()}${pad2(stamp.getMonth() + 1)}${pad2(stamp.getDate())}_${pad2(stamp.getHours())}${pad2(stamp.getMinutes())}${pad2(stamp.getSeconds())}.png`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        resolve();
      }, "image/png");
    });
    setStatus("저장했습니다. 다운로드 폴더를 확인하세요.");
  }

  // ──────────────────────────────────────────────
  // 진입점 — 툴바 아이콘 클릭이 호출한다
  // ──────────────────────────────────────────────
  window.__balcheOpen = () => {
    let text = "";
    try {
      const sel = window.getSelection();
      if (sel) text = sel.toString().replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    } catch {
      /* 무시 */
    }
    openModal(text);
  };
})();
