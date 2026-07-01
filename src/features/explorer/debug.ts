import { useEffect, useRef, type RefObject } from "react";

type ExplorerDebugDetails = Record<string, unknown>;

const DEBUG_FLAG_KEY = "debugExplorer";
let domHooksInstalled = false;
let originalScrollIntoView: Element["scrollIntoView"] | null = null;
let originalFocus: HTMLElement["focus"] | null = null;

function readDebugEnabled() {
  if (process.env.NODE_ENV === "production") return false;
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get(DEBUG_FLAG_KEY) === "1") return true;
  return window.localStorage.getItem(DEBUG_FLAG_KEY) === "1";
}

function sanitize(details: ExplorerDebugDetails | undefined): ExplorerDebugDetails {
  if (!details) return {};
  const output: ExplorerDebugDetails = {};
  for (const [key, value] of Object.entries(details)) {
    if (typeof value === "function") continue;
    output[key] = value;
  }
  return output;
}

function describeElement(element: Element | null | undefined) {
  if (!element) return null;
  const htmlElement = element as HTMLElement;
  const className = typeof htmlElement.className === "string" ? htmlElement.className : "";
  return {
    tag: element.tagName,
    id: htmlElement.id || null,
    className: className ? className.split(/\s+/).slice(0, 4).join(" ") : null,
    dataTab: htmlElement.getAttribute("data-tab"),
    dataDocAnchor: htmlElement.getAttribute("data-doc-anchor"),
  };
}

function ensureDebugDomHooks() {
  if (domHooksInstalled) return;
  if (!readDebugEnabled()) return;
  if (typeof window === "undefined" || typeof Element === "undefined" || typeof HTMLElement === "undefined") return;

  originalScrollIntoView = Element.prototype.scrollIntoView;
  originalFocus = HTMLElement.prototype.focus;

  Element.prototype.scrollIntoView = function scrollIntoView(this: Element, ...args: Parameters<Element["scrollIntoView"]>) {
    explorerDebugLog("dom", "scrollIntoView", {
      target: describeElement(this),
      args: args.length,
    });
    return originalScrollIntoView?.apply(this, args as never);
  };

  HTMLElement.prototype.focus = function focus(this: HTMLElement, ...args: Parameters<HTMLElement["focus"]>) {
    explorerDebugLog("dom", "focus", {
      target: describeElement(this),
      args: args.length,
    });
    return originalFocus?.apply(this, args as never);
  };

  domHooksInstalled = true;
}

export function explorerDebugEnabled() {
  return readDebugEnabled();
}

export function explorerDebugLog(scope: string, event: string, details?: ExplorerDebugDetails) {
  if (!readDebugEnabled()) return;
  // eslint-disable-next-line no-console
  console.debug(`[explorer-debug] ${scope} ${event} ${JSON.stringify(sanitize(details))}`);
}

export function useExplorerDebugLifecycle(scope: string, details?: ExplorerDebugDetails) {
  const renderCountRef = useRef(0);
  const detailsRef = useRef<ExplorerDebugDetails | undefined>(details);
  detailsRef.current = details;
  renderCountRef.current += 1;

  useEffect(() => {
    if (!readDebugEnabled()) return;
    ensureDebugDomHooks();
    explorerDebugLog(scope, "mount", {
      renderCount: renderCountRef.current,
      ...sanitize(detailsRef.current),
    });
    return () => {
      explorerDebugLog(scope, "unmount", {
        renderCount: renderCountRef.current,
        ...sanitize(detailsRef.current),
      });
    };
  }, [scope]);

  useEffect(() => {
    if (!readDebugEnabled()) return;
    explorerDebugLog(scope, "render", {
      renderCount: renderCountRef.current,
      ...sanitize(detailsRef.current),
    });
  });
}

export function useExplorerDebugLayout<T extends HTMLElement>(
  scope: string,
  ref: RefObject<T | null>,
  details?: ExplorerDebugDetails,
) {
  const detailsRef = useRef<ExplorerDebugDetails | undefined>(details);
  detailsRef.current = details;

  useEffect(() => {
    if (!readDebugEnabled()) return;
    ensureDebugDomHooks();
    const node = ref.current;
    if (!node) return;

    const logLayout = (reason: string) => {
      explorerDebugLog(scope, "layout", {
        reason,
        height: Math.ceil(node.getBoundingClientRect().height),
        scrollY: typeof window !== "undefined" ? Math.round(window.scrollY) : undefined,
        activeElement: typeof document !== "undefined" ? document.activeElement?.tagName || null : null,
        ...sanitize(detailsRef.current),
      });
    };

    logLayout("mount");

    if (typeof ResizeObserver === "undefined") {
      return () => logLayout("unmount");
    }

    const observer = new ResizeObserver(() => {
      logLayout("resize");
    });
    observer.observe(node);

    return () => {
      observer.disconnect();
      logLayout("unmount");
    };
  }, [ref, scope]);
}
