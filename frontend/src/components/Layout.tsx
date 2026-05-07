import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import { LayoutDashboard, FolderKanban, LogOut, Zap, Menu, X, Bell, Check } from "lucide-react";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  async function handleLogout() {
    if (!confirm("Are you sure you want to sign out?")) return;
    await logout();
    navigate("/login");
  }

  function loadNotifications() {
    api.get("/notifications").then(({ data }) => {
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    }).catch(() => {});
  }

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000); // poll every 15s
    return () => clearInterval(interval);
  }, []);

  async function markAllRead() {
    await api.patch("/notifications/read-all");
    setUnreadCount(0);
    setNotifications((n) => n.map((x) => ({ ...x, read: true })));
  }

  const links = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/projects", label: "Projects", icon: FolderKanban },
  ];

  const sidebar = (
    <>
      <div className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent-dark to-accent shadow-glow-sm">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-semibold text-white">FloX</span>
        </div>
        <button onClick={() => setSidebarOpen(false)} className="lg:hidden rounded-lg p-1.5 text-gray-400 hover:bg-white/5 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "bg-accent/10 text-accent shadow-glow-sm"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/5 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent/20 to-cyan-500/20 text-sm font-semibold text-accent">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-white">{user?.name}</p>
            <p className="truncate text-xs text-gray-500">{user?.role}</p>
          </div>
          <button onClick={handleLogout} className="rounded-lg p-2 text-gray-500 hover:bg-white/5 hover:text-red-400 transition-colors" title="Logout">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar - desktop */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-white/5 bg-dark-800/80 backdrop-blur-xl">
        {sidebar}
      </aside>

      {/* Sidebar - mobile */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/5 bg-dark-800 backdrop-blur-xl transition-transform duration-200 lg:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {sidebar}
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex items-center justify-between border-b border-white/5 bg-dark-800/50 px-4 py-3 lg:hidden">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white">
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-accent" />
              <span className="font-semibold text-white">FloX</span>
            </div>
          </div>
          <button onClick={() => setNotifOpen(!notifOpen)} className="relative rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto bg-dark-900 p-4 sm:p-6 lg:p-8 relative">
          {/* Desktop notification bell */}
          <div className="hidden lg:block fixed top-4 right-6 z-30">
            <button onClick={() => setNotifOpen(!notifOpen)} className="relative rounded-lg p-2.5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors glass">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white animate-pulse">{unreadCount > 9 ? "9+" : unreadCount}</span>}
            </button>
          </div>

          {/* Notification panel */}
          {notifOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
              <div className="fixed top-14 right-4 lg:top-16 lg:right-6 z-50 w-80 max-h-[70vh] glass rounded-xl shadow-2xl overflow-hidden animate-in">
                <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
                  <h3 className="font-semibold text-white text-sm">Notifications</h3>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-accent hover:text-accent-light">
                      <Check className="h-3 w-3" /> Mark all read
                    </button>
                  )}
                </div>
                <div className="overflow-y-auto max-h-[60vh]">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <Bell className="mx-auto h-6 w-6 text-gray-600" />
                      <p className="mt-2 text-xs text-gray-500">No notifications yet</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-white/5">
                      {notifications.map((n) => (
                        <li
                          key={n.id}
                          onClick={() => { if (n.linkUrl) navigate(n.linkUrl); setNotifOpen(false); }}
                          className={`px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors ${!n.read ? "bg-accent/5 border-l-2 border-accent" : ""}`}
                        >
                          <p className={`text-xs ${!n.read ? "text-white font-medium" : "text-gray-400"}`}>{n.message}</p>
                          <p className="mt-0.5 text-[10px] text-gray-600">{timeAgo(n.createdAt)}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </>
          )}

          <Outlet />
        </main>
      </div>
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
