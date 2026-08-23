"use client";

import { useEffect } from "react";

/**
 * Component ngăn chặn các lỗi runtime ngoại lai do Chrome/Edge/Firefox Extension
 * tự động tiêm (inject) vào trang web gây hiện Error Overlay khó chịu trong lúc phát triển.
 */
export function ExtensionErrorGuard() {
  useEffect(() => {
    const handleWindowError = (event: ErrorEvent) => {
      const filename = event.filename || "";
      const message = event.message || "";
      const stack = event.error?.stack || "";

      // Kiểm tra nếu lỗi bắt nguồn từ extension của trình duyệt
      if (
        filename.includes("chrome-extension://") ||
        filename.includes("moz-extension://") ||
        filename.includes("safari-extension://") ||
        stack.includes("chrome-extension://") ||
        stack.includes("moz-extension://") ||
        message.includes("M_ID")
      ) {
        event.stopImmediatePropagation();
        event.preventDefault();
        console.warn("[ExtensionErrorGuard] Ignored 3rd-party browser extension error:", message);
        return true;
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason?.toString() || "";
      const stack = event.reason?.stack || "";

      if (
        reason.includes("chrome-extension://") ||
        stack.includes("chrome-extension://") ||
        reason.includes("M_ID")
      ) {
        event.stopImmediatePropagation();
        event.preventDefault();
        console.warn("[ExtensionErrorGuard] Ignored 3rd-party browser extension rejection:", reason);
        return true;
      }
    };

    window.addEventListener("error", handleWindowError, true);
    window.addEventListener("unhandledrejection", handleUnhandledRejection, true);

    return () => {
      window.removeEventListener("error", handleWindowError, true);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection, true);
    };
  }, []);

  return null;
}
