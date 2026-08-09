/** Бүтэн дэлгэц / immersive — Fullscreen API + CSS fallback */

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

function pageRoot(): HTMLElement {
  return (
    (document.querySelector(".herder-page") as HTMLElement | null) ??
    document.documentElement
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

async function requestFs(el: HTMLElement): Promise<boolean> {
  const node = el as FsEl;
  try {
    if (node.requestFullscreen) {
      await node.requestFullscreen();
      return true;
    }
    if (node.webkitRequestFullscreen) {
      await Promise.resolve(node.webkitRequestFullscreen());
      return true;
    }
    if (node.webkitRequestFullScreen) {
      await Promise.resolve(node.webkitRequestFullScreen());
      return true;
    }
  } catch {
    return false;
  }
  return false;
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
  // Эхлээд бүтэн хуудас, дараа нь тоглоомын root
  if (await requestFs(document.documentElement)) return true;
  if (await requestFs(pageRoot())) return true;
  // API хориглосон ч CSS immersive үлдэнэ — хар хүрээ багасна
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

/** Цэс — асаах/унтраах */
export async function toggleImmersiveDisplay(): Promise<boolean> {
  if (isImmersiveDisplay()) {
    await exitImmersiveDisplay();
    return false;
  }
  return enterImmersiveDisplay();
}
