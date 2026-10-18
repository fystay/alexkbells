import type { CSSProperties } from "react";

/**
 * Scroll reveal foundation (2026-10-18). Mark any element with `data-reveal`
 * and it fades up the first time it scrolls into view. Stagger siblings with
 * `style={revealDelay(i)}`.
 *
 * REVEAL_SCRIPT runs inline in <head>, before first paint and without waiting
 * for React, so nothing flashes and nothing depends on hydration. It only
 * switches the effect on (html[data-reveal-ready]) when IntersectionObserver
 * exists and the visitor hasn't asked for reduced motion; otherwise every
 * element simply shows. The CSS lives in globals.css.
 */
export const REVEAL_SCRIPT = `(function(){var d=document.documentElement;if(!("IntersectionObserver"in window)||matchMedia("(prefers-reduced-motion: reduce)").matches)return;d.setAttribute("data-reveal-ready","");var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.setAttribute("data-revealed","");io.unobserve(e.target)}})},{rootMargin:"0px 0px -8% 0px",threshold:0.12});var seen=new WeakSet();function scan(){var els=document.querySelectorAll("[data-reveal]:not([data-revealed])");for(var i=0;i<els.length;i++){if(!seen.has(els[i])){seen.add(els[i]);io.observe(els[i])}}}new MutationObserver(scan).observe(d,{childList:true,subtree:true});document.addEventListener("DOMContentLoaded",scan)})();`;

/** Stagger for the i-th item of a revealed list (80 ms apart, capped). */
export function revealDelay(i: number): CSSProperties {
  return { "--reveal-delay": `${Math.min(i, 6) * 80}ms` } as CSSProperties;
}
