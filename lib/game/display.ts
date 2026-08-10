/** Бүтэн дэлгэц / immersive — Fullscreen API + CSS fallback (iOS-д CSS + PWA) */

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

/** Browser-ийн жинхэнэ Fullscreen API байгаа эсэх (iPhone Safari = ихэвчлэн үгүй) */
export function canUseBrowserFullscreen(): boolean {
  if (typeof document === "undefined") return false;
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

/** visualViewport → CSS хувьсагч (адрес барын доорх бодит өндөр) */
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
  // Safari хаягийн мөрийг бага зэрэг нуух оролдлого
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
      /* зөвшөөрөгдөөгүй — үл хэрэгс */
    });
  }
}

/**
 * Зөвхөн нэг удаа requestFullscreen — хэрэглэгчийн gesture-ийг бүү алд.
 * (Олон await/давтан дуудах нь mobile дээр FS хориглодог.)
 */
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
    // ignore
  }
}

/** Асаана: CSS дүүргэлт + боломжтой бол браузерын fullscreen */
export async function enterImmersiveDisplay(): Promise<boolean> {
  setImmersiveClass(true);
  tryHideMobileChrome();
  tryLockLandscape();

  if (isBrowserFullscreen()) return true;

  // Gesture хадгалахын тулд зөвхөн documentElement дээр нэг удаа
  const ok = await requestFsOnce(document.documentElement);
  if (ok || isBrowserFullscreen()) return true;

  return isImmersiveDisplay();
}

export async function exitImmersiveDisplay(): Promise<void> {
  await exitFs();
  setImmersiveClass(false);
}

/**
 * O товч — үргэлж томруулна (ESC-ээр гарсны дараа дахин ороход).
 * Гаргах: ESC эсвэл цэснээс.
 */
export async function ensureImmersiveDisplay(): Promise<boolean> {
  return enterImmersiveDisplay();
}

/**
 * Full товч:
 * - Жинхэнэ browser fullscreen байвал → гаргана
 * - Үгүй бол → орно (CSS уже ассан ч дахин FS оролдоно)
 * - iPhone Safari (API байхгүй) → CSS + PWA заавар ("hint"), бүү унтраа
 */
export async function toggleImmersiveDisplay(): Promise<ImmersiveToggleResult> {
  if (isBrowserFullscreen()) {
    await exitImmersiveDisplay();
    return "exited";
  }

  await enterImmersiveDisplay();

  if (!canUseBrowserFullscreen()) {
    return "hint";
  }
  return "entered";
}

/** iPhone/iPad Safari — Home Screen заавар */
export function mobileFullscreenHintMn(): string {
  return "iPhone: Share → Add to Home Screen → нээгээд тогло (бүтэн дэлгэц)";
}
