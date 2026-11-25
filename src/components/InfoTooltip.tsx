"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { HelpCircle } from "lucide-react";

export interface InfoTooltipProps {
  label: string;
  title?: string;
  content: string;
  href?: string;
  linkText?: string;
  iconSize?: "xs" | "sm";
}

interface PopoverCoords {
  top: number;
  left: number;
  placeBelow: boolean;
}

export default function InfoTooltip({
  label,
  title,
  content,
  href,
  linkText = "Learn more →",
  iconSize = "xs",
}: InfoTooltipProps) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<PopoverCoords>({
    top: 0,
    left: 12,
    placeBelow: false,
  });

  useEffect(() => {
    setMounted(true);
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el || typeof window === "undefined") return;
    const rect = el.getBoundingClientRect();
    const popoverWidth = Math.min(256, window.innerWidth - 24);
    const margin = 12;
    const rawLeft = rect.left + rect.width / 2 - popoverWidth / 2;
    const clampedLeft = Math.max(
      margin,
      Math.min(rawLeft, window.innerWidth - popoverWidth - margin)
    );
    const placeBelow = rect.top < 140;
    const top = placeBelow ? rect.bottom + 8 : rect.top - 8;

    setCoords({ top, left: clampedLeft, placeBelow });
  }, []);

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const supportsHover = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(hover: hover)").matches;

  const handleOpen = () => {
    if (!supportsHover()) return;
    clearCloseTimer();
    updatePosition();
    setOpen(true);
  };

  const handleDelayedClose = () => {
    if (!supportsHover()) return;
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
    }, 120);
  };

  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    const handleViewportChange = () => {
      setOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick, {
      passive: true,
    });
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", handleViewportChange, true);
    window.addEventListener("resize", handleViewportChange);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", handleViewportChange, true);
      window.removeEventListener("resize", handleViewportChange);
    };
  }, [open]);

  const sizeClass = iconSize === "sm" ? "w-4 h-4" : "w-3.5 h-3.5";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        onMouseEnter={handleOpen}
        onMouseLeave={handleDelayedClose}
        onFocus={() => {
          clearCloseTimer();
          updatePosition();
          setOpen(true);
        }}
        onBlur={handleDelayedClose}
        onClick={(e) => {
          e.stopPropagation();
          clearCloseTimer();
          if (!open) {
            updatePosition();
            setOpen(true);
          } else {
            setOpen(false);
          }
        }}
        className="inline-flex items-center justify-center p-1 -m-1 rounded-full text-stone-400 hover:text-[#143929] focus:text-[#143929] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#143929]/40 transition-colors align-middle shrink-0"
      >
        <HelpCircle className={sizeClass} />
      </button>

      {open &&
        mounted &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            role="tooltip"
            onMouseEnter={() => {
              if (supportsHover()) clearCloseTimer();
            }}
            onMouseLeave={handleDelayedClose}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              maxWidth: "calc(100vw - 24px)",
              transform: coords.placeBelow ? "none" : "translateY(-100%)",
            }}
            className="w-64 bg-[#102A20] text-[#F7F4EC] border border-[#295240] rounded-lg px-3 py-2.5 shadow-xl text-[11px] leading-relaxed z-[9999]"
          >
            {title && (
              <div className="text-[#E5C785] font-semibold mb-1">{title}</div>
            )}
            <p className="text-[#F7F4EC]/95">{content}</p>
            {href && (
              <Link
                href={href}
                onClick={() => setOpen(false)}
                className="text-[#A7DFBF] hover:underline font-medium mt-1.5 inline-block"
              >
                {linkText}
              </Link>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
