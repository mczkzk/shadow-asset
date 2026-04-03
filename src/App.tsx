import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import Dashboard from "@/pages/Dashboard";
import Accounts from "@/pages/Accounts";

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

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-zinc-50">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center gap-2 px-6 py-3">
            <h1 className="mr-6 text-lg font-bold text-zinc-800">
              Shadow Asset
            </h1>
            <NavItem to="/">ダッシュボード</NavItem>
            <NavItem to="/accounts">保有管理</NavItem>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/accounts" element={<Accounts />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
