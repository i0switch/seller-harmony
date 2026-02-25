import { Outlet } from "react-router-dom";

export default function BuyerLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="h-14 border-b flex items-center justify-center bg-card">
        <span className="text-sm font-semibold">🎫 ファンクラブ</span>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
