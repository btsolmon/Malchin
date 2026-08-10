/**
 * Бүтэн дэлгэц — тоглоом + joystick хамт:
 * Fullscreen API-г `.herder-stage-wrap` дээр (canvas + touch controls).
 * iPhone Safari элемент FS зөвшөөрөхгүй тул CSS immersive + PWA.
 *
 * (Видео webkitEnterFullscreen — joystick алдана, тоглоход хэрэггүй.)
 */

const IMMERSIVE_CLASS = "herder-immersive";

type FsDoc = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitCancelFullScreen?: () => Promise<void> | void;
};

type FsEl = HTMLElement & {
  requestFullscreen?: (opts?: FullscreenOptions) => Promise<void>;
  webkitRequestFullscreen?: () => Promise<void> | void;
  webkitRequestFullScreen?: () => Promise<void> | void;
};

export type ImmersiveToggleResult = "entered" | "exited" | "hint";

function pageRoot(): HTMLElement {
  return (
    (document.querySelector(".herder-page") as HTMLElement | null) ??
    document.documentElement
  );
}

/** Canvas + TouchControls багтсан root — fullscreen-д joystick үлдэнэ */
function stageWrap(): HTMLElement | null {
  return document.querySelector(".herder-stage-wrap") as HTMLElement | null;
}

export function canUseBrowserFullscreen(): boolean {
  if (typeof document === "undefined") return false;
  const doc = document as Document & {
    fullscreenEnabled?: boolean;
    webkitFullscreenEnabled?: boolean;
  };
  if (doc.fullscreenEnabled === false && !doc.webkitFullscreenEnabled) {
    return false;
  }
  const el = document.documentElement as FsEl;
  return !!(
    el.requestFullscreen ||
    el.webkitRequestFullscreen ||
    el.webkitRequestFullScreen
  );
}

export function isBrowserFullscreen(): boolean {
  const doc = document as FsDoc;
  return !!(document.fullscreenElement || doc.webkitFullscreenElement);
}

export function isImmersiveDisplay(): boolean {
  return (
    isBrowserFullscreen() ||
    document.documentElement.classList.contains(IMMERSIVE_CLASS) ||
    pageRoot().classList.contains(IMMERSIVE_CLASS)
  );
}

function setImmersiveClass(on: boolean): void {
  const targets = [document.documentElement, document.body, pageRoot()];
  for (const el of targets) {
    if (!el) continue;
    if (on) el.classList.add(IMMERSIVE_CLASS);
    else el.classList.remove(IMMERSIVE_CLASS);
  }
}

export function syncVisualViewportVars(): void {
  if (typeof window === "undefined") return;
  const vv = window.visualViewport;
  const w = Math.round(vv?.width ?? window.innerWidth);
  const h = Math.round(vv?.height ?? window.innerHeight);
  const root = document.documentElement;
  root.style.setProperty("--vvw", `${w}px`);
  root.style.setProperty("--vvh", `${h}px`);
}

function tryHideMobileChrome(): void {
  syncVisualViewportVars();
  window.scrollTo(0, 1);
  requestAnimationFrame(() => {
    window.scrollTo(0, 1);
    syncVisualViewportVars();
  });
}

function tryLockLandscape(): void {
  const orient = screen.orientation as ScreenOrientation & {
    lock?: (o: string) => Promise<void>;
  };
  if (typeof orient?.lock === "function") {
    void orient.lock("landscape").catch(() => {
      /* ignore */
    });
  }
}

function isLikelyAppleTouch(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

function requestFsOnce(el: HTMLElement): Promise<boolean> {
  const node = el as FsEl;
  try {
    if (typeof node.requestFullscreen === "function") {
      return node
        .requestFullscreen({ navigationUI: "hide" })
        .then(() => true)
        .catch(() => false);
    }
    if (typeof node.webkitRequestFullscreen === "function") {
      return Promise.resolve(node.webkitRequestFullscreen())
        .then(() => true)
        .catch(() => false);
    }
    if (typeof node.webkitRequestFullScreen === "function") {
      return Promise.resolve(node.webkitRequestFullScreen())
        .then(() => true)
        .catch(() => false);
    }
  } catch {
    return Promise.resolve(false);
  }
  return Promise.resolve(false);
}

async function exitFs(): Promise<void> {
  const doc = document as FsDoc;
  try {
    if (document.exitFullscreen && document.fullscreenElement) {
      await document.exitFullscreen();
    } else if (doc.webkitExitFullscreen && doc.webkitFullscreenElement) {
      await Promise.resolve(doc.webkitExitFullscreen());
    } else if (doc.webkitCancelFullScreen && doc.webkitFullscreenElement) {
      await Promise.resolve(doc.webkitCancelFullScreen());
    }
  } catch {
    /* ignore */
  }
}

/** Асаана: CSS + stage-wrap fullscreen (joystick хамт) */
export async function enterImmersiveDisplay(): Promise<boolean> {
  setImmersiveClass(true);
  tryHideMobileChrome();
  tryLockLandscape();

  if (isBrowserFullscreen()) return true;

  // Эхлээд stage (canvas + joystick) — gesture-ийг бүү алд, нэг л удаа
  const wrap = stageWrap();
  if (wrap && (await requestFsOnce(wrap))) return true;

  // Fallback: бүтэн хуудас
  if (await requestFsOnce(document.documentElement)) return true;

  return isImmersiveDisplay();
}

export async function exitImmersiveDisplay(): Promise<void> {
  await exitFs();
  setImmersiveClass(false);
}

export async function ensureImmersiveDisplay(): Promise<boolean> {
  return enterImmersiveDisplay();
}

export async function toggleImmersiveDisplay(): Promise<ImmersiveToggleResult> {
  if (isBrowserFullscreen()) {
    await exitImmersiveDisplay();
    return "exited";
  }

  // CSS-only (iPhone) уже ассан бол дахин FS оролдоно; гаргахгүй
  await enterImmersiveDisplay();

  if (isBrowserFullscreen()) return "entered";
  if (isLikelyAppleTouch() || !canUseBrowserFullscreen()) return "hint";
  return isImmersiveDisplay() ? "entered" : "hint";
}

/** iPhone — joystick-той бүтэн дэлгэц зөвхөн Home Screen-ээр */
export function mobileFullscreenHintMn(): string {
  if (isLikelyAppleTouch()) {
    return "iPhone: Share → Add to Home Screen → нээгээд тогло (joystick + бүтэн дэлгэц)";
  }
  return "Full дахин дар, эсвэл браузерын fullscreen зөвшөөр.";
}

export function mobileFullscreenEnteredTipMn(): string | null {
  return null;
}

/** Хуучин video-path API — no-op (compat) */
export function bindDisplayCanvas(_canvas: HTMLCanvasElement | null): void {
  /* video fullscreen хассан */
}

export function armVideoFullscreen(): void {
  /* video fullscreen хассан */
}
