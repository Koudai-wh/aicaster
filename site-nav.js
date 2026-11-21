(function () {
  "use strict";
  var links = [
    ["/", "概要", "overview"],
    ["/morely/", "Morely", "morely"],
    ["/aicaster/", "AICaster", "aicaster"],
    ["/ai-room.html", "AI MeetingRoom", "meeting"],
    ["/blog.html", "Blog", "blog"],
  ];
  var path = location.pathname.replace(/\/+$/, "") || "/";
  var current = path === "/" ? "overview"
    : path.indexOf("/morely") === 0 ? "morely"
    : path.indexOf("/aicaster") === 0 || path === "/news.html" ? "aicaster"
    : path === "/ai-room" || path === "/ai-room.html" ? "meeting"
    : path === "/blog" || path === "/blog.html" ? "blog" : "";
  var style = document.createElement("style");
  style.textContent = ".global-site-nav{position:sticky;top:0;z-index:1000;background:#fff;border-bottom:1px solid #dce3eb;color:#182230;font:500 14px/1.2 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}.global-site-nav .inner{width:min(100% - 32px,1080px);margin:auto;display:flex;gap:6px;overflow-x:auto;white-space:nowrap;scrollbar-width:thin;padding:8px 0}.global-site-nav a{display:inline-flex;align-items:center;min-height:34px;padding:0 12px;border-radius:999px;color:inherit;text-decoration:none}.global-site-nav a:hover,.global-site-nav a[aria-current=page]{background:#eaf2f9;color:#0d4e83}.global-site-nav a:focus-visible{outline:3px solid #f0c000;outline-offset:2px}";
  document.head.appendChild(style);
  var nav = document.createElement("nav");
  nav.className = "global-site-nav";
  nav.setAttribute("aria-label", "サイト内ページ");
  var inner = document.createElement("div");
  inner.className = "inner";
  links.forEach(function (entry) {
    var a = document.createElement("a");
    a.href = entry[0];
    a.textContent = entry[1];
    if (entry[2] === current) a.setAttribute("aria-current", "page");
    inner.appendChild(a);
  });
  nav.appendChild(inner);
  document.body.insertBefore(nav, document.body.firstChild);
})();
