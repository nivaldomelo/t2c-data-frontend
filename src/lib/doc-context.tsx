import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { defaultDoc } from "@/docs/default";
import type { DocContent } from "@/docs/types";

const DOC_PANEL_OPEN_KEY = "doc_panel_open";

type ScrollTarget = {
  anchorId: string;
  nonce: number;
};

type DocContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  scrollTo: (anchorId: string) => void;
  setDoc: (docId: string, docContent: DocContent) => void;
  docId: string;
  docContent: DocContent;
  scrollTarget: ScrollTarget | null;
};

const DocContext = createContext<DocContextValue | null>(null);

export function DocProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  const [docId, setDocId] = useState(defaultDoc.id);
  const [docContent, setDocContent] = useState<DocContent>(defaultDoc);
  const [scrollTarget, setScrollTarget] = useState<ScrollTarget | null>(null);
  const nonceRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const persisted = window.localStorage.getItem(DOC_PANEL_OPEN_KEY);
    if (persisted === "true" || persisted === "false") {
      setIsOpen(persisted === "true");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(DOC_PANEL_OPEN_KEY, String(isOpen));
  }, [isOpen]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  const scrollTo = useCallback((anchorId: string) => {
    if (!anchorId) return;
    setIsOpen(true);
    nonceRef.current += 1;
    setScrollTarget({ anchorId, nonce: nonceRef.current });
  }, []);

  const setDoc = useCallback((nextDocId: string, nextDocContent: DocContent) => {
    setDocId(nextDocId);
    setDocContent(nextDocContent);
  }, []);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchorEl = target?.closest("[data-doc-anchor]") as HTMLElement | null;
      if (!anchorEl) return;
      const anchor = anchorEl.getAttribute("data-doc-anchor");
      if (!anchor) return;
      scrollTo(anchor);
    };

    document.addEventListener("click", onDocumentClick);
    return () => document.removeEventListener("click", onDocumentClick);
  }, [scrollTo]);

  const value = useMemo<DocContextValue>(
    () => ({
      isOpen,
      open,
      close,
      toggle,
      scrollTo,
      setDoc,
      docId,
      docContent,
      scrollTarget,
    }),
    [isOpen, open, close, toggle, scrollTo, setDoc, docId, docContent, scrollTarget],
  );

  return <DocContext.Provider value={value}>{children}</DocContext.Provider>;
}

export function useDoc(): DocContextValue {
  const ctx = useContext(DocContext);
  if (!ctx) throw new Error("useDoc must be used within DocProvider");
  return ctx;
}

type DocTargetProps = {
  anchor: string;
  children: ReactNode;
  className?: string;
};

export function DocTarget({ anchor, children, className }: DocTargetProps) {
  return (
    <div className={className} data-doc-anchor={anchor}>
      {children}
    </div>
  );
}

export function bindDocAnchor(anchorId: string): { "data-doc-anchor": string } {
  return { "data-doc-anchor": anchorId };
}
