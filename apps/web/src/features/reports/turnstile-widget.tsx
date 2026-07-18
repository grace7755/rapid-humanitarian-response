import { useEffect, useRef } from "react";

type TurnstileApi = {
  remove: (widgetId: string) => void;
  render: (
    container: HTMLElement,
    options: {
      callback: (token: string) => void;
      "error-callback": () => void;
      "expired-callback": () => void;
      sitekey: string;
      theme: "auto";
    },
  ) => string;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

type TurnstileWidgetProps = {
  errorId?: string;
  onTokenChange: (token: string) => void;
  resetKey: number;
  siteKey: string;
};

const SCRIPT_ID = "cloudflare-turnstile-script";

export default function TurnstileWidget({
  errorId,
  onTokenChange,
  resetKey,
  siteKey,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let widgetId: string | undefined;
    let cancelled = false;
    if (containerRef.current) {
      containerRef.current.dataset.resetKey = String(resetKey);
    }

    const render = () => {
      if (cancelled || widgetId || !containerRef.current || !window.turnstile) {
        return;
      }
      widgetId = window.turnstile.render(containerRef.current, {
        callback: onTokenChange,
        "error-callback": () => onTokenChange(""),
        "expired-callback": () => onTokenChange(""),
        sitekey: siteKey,
        theme: "auto",
      });
    };

    const existingScript = document.getElementById(SCRIPT_ID);
    if (existingScript) {
      if (window.turnstile) render();
      else existingScript.addEventListener("load", render, { once: true });
    } else {
      const script = document.createElement("script");
      script.async = true;
      script.defer = true;
      script.id = SCRIPT_ID;
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.addEventListener("load", render, { once: true });
      document.head.append(script);
    }

    return () => {
      cancelled = true;
      existingScript?.removeEventListener("load", render);
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [onTokenChange, resetKey, siteKey]);

  return (
    <fieldset aria-describedby={errorId}>
      <legend className="sr-only">Human verification</legend>
      <div ref={containerRef} />
    </fieldset>
  );
}
