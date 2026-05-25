import { useEffect } from "react";
import { useDocumentStore } from "../stores/documentStore.js";

export function useTheme() {
  const theme = useDocumentStore((state) => state.settings?.theme ?? "dark");

  useEffect(() => {
    const root = document.documentElement;

    if (theme === "light") {
      root.classList.remove("dark");
      root.classList.add("light");
      root.style.colorScheme = "light";
    } else {
      root.classList.remove("light");
      root.classList.add("dark");
      root.style.colorScheme = "dark";
    }
  }, [theme]);
}
