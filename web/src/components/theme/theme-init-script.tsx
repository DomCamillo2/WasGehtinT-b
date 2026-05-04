export function ThemeInitScript() {
  const script = `(function(){
    try {
      var storageKey = "wgt-theme";
      var root = document.documentElement;
      var stored = localStorage.getItem(storageKey);
      var mode = stored === "dark" || stored === "light" ? stored : "system";
      var systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      var resolved = mode === "system" ? (systemDark ? "dark" : "light") : mode;

      root.classList.remove("light", "dark");
      root.classList.add(resolved);
      root.style.colorScheme = resolved;
    } catch (_error) {
      // Keep the default CSS fallback if localStorage or media query is unavailable.
    }
  })();`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
