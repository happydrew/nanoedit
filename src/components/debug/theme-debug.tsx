"use client";

import { useTheme } from "next-themes";
import { useState, useEffect } from "react";

export default function ThemeDebug() {
  const themeData = useTheme();
  const [mounted, setMounted] = useState(false);
  const [renderCount, setRenderCount] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setRenderCount(prev => prev + 1);
    console.log("ThemeDebug render #", renderCount + 1, {
      mounted,
      theme: themeData.theme,
      resolvedTheme: themeData.resolvedTheme,
      systemTheme: themeData.systemTheme,
    });
  });

  return (
    <div className="p-4 border rounded">
      <h3 className="font-bold mb-2">Theme Debug Info</h3>
      <div className="space-y-1 text-sm">
        <div>Mounted: {mounted.toString()}</div>
        <div>Render Count: {renderCount}</div>
        <div>theme: {JSON.stringify(themeData.theme)}</div>
        <div>resolvedTheme: {JSON.stringify(themeData.resolvedTheme)}</div>
        <div>systemTheme: {JSON.stringify(themeData.systemTheme)}</div>
      </div>
    </div>
  );
}