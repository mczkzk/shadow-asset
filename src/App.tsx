import { useState, useRef, useEffect } from "react";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { save, open } from "@tauri-apps/plugin-dialog";
import Dashboard from "@/pages/Dashboard";
import Accounts from "@/pages/Accounts";
import Allocation from "@/pages/Allocation";
import * as api from "@/lib/api";

function NavItem({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
          isActive
            ? "bg-indigo-100 text-indigo-700"
            : "text-zinc-600 hover:bg-zinc-100"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

function GearMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmImport, setConfirmImport] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleExport = async () => {
    setError(null);
    setIsOpen(false);
    try {
      const path = await save({
        defaultPath: "shadow-asset-backup.json",
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (!path) return;
      await api.exportData(path);
    } catch (e) {
      setError(`エクスポート失敗: ${e}`);
    }
  };

  const handleImportPick = async () => {
    setError(null);
    setIsOpen(false);
    try {
      const path = await open({
        filters: [{ name: "JSON", extensions: ["json"] }],
        multiple: false,
      });
      if (!path || typeof path !== "string") return;
      setConfirmImport(path);
    } catch (e) {
      setError(`ファイル選択失敗: ${e}`);
    }
  };

  const handleImportConfirm = async () => {
    if (!confirmImport) return;
    setError(null);
    try {
      await api.importData(confirmImport);
      setConfirmImport(null);
      window.location.reload();
    } catch (e) {
      setConfirmImport(null);
      setError(`インポート失敗: ${e}`);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
        aria-label="設定"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
          <button
            onClick={handleExport}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            エクスポート
          </button>
          <button
            onClick={handleImportPick}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12M12 16.5V3" />
            </svg>
            インポート
          </button>
        </div>
      )}

      {confirmImport && (
        <div className="fixed inset-x-0 top-14 z-30 mx-auto max-w-5xl px-6">
          <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm shadow-md">
            <span className="text-amber-800">
              <span className="font-medium">{confirmImport.replace(/.*[/\\]/, "")}</span>
              {" "}をインポートすると既存データが全て置き換わります。続行しますか?
            </span>
            <button
              onClick={handleImportConfirm}
              className="rounded bg-red-500 px-3 py-1 text-xs text-white hover:bg-red-600"
            >
              実行
            </button>
            <button
              onClick={() => setConfirmImport(null)}
              className="text-xs text-zinc-500 hover:text-zinc-700"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed inset-x-0 top-14 z-30 mx-auto max-w-5xl px-6">
          <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm shadow-md">
            <span className="text-red-600">{error}</span>
            <button onClick={() => setError(null)} className="text-xs text-zinc-500 hover:text-zinc-700">
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-zinc-50">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center gap-2 px-6 py-3">
            <NavItem to="/">ダッシュボード</NavItem>
            <NavItem to="/allocation">アロケーション</NavItem>
            <NavItem to="/accounts">保有管理</NavItem>
            <div className="ml-auto">
              <GearMenu />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/allocation" element={<Allocation />} />
            <Route path="/accounts" element={<Accounts />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
