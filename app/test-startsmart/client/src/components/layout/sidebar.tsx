import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ui/theme-provider";
import { Moon, Sun, Settings, LogOut } from "lucide-react";
import type { User } from "@shared/schema";

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  user?: User;
}

export function Sidebar({ activeSection, onSectionChange, user }: SidebarProps) {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const navItems = [
    { key: "home", icon: "fas fa-home", label: "Home" },
    { key: "chat", icon: "fas fa-comments", label: "AI Chat" },
    { key: "roadmap", icon: "fas fa-route", label: "Progress Roadmap" },
    { key: "documents", icon: "fas fa-file-alt", label: "Document Center" },
    { key: "knowledge", icon: "fas fa-book", label: "Knowledge Hub" },
    { key: "tools", icon: "fas fa-tools", label: "Startup Tools" },
    { key: "compliance", icon: "fas fa-shield-alt", label: "Compliance" },
  ];

  return (
    <aside className="hidden lg:flex lg:w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex-col">
      {/* Logo Section */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-3">
          <Logo size="lg" />
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">StartSmart</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">by NexTax.AI</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => onSectionChange(item.key)}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
              activeSection === item.key
                ? "nexTax-gradient text-white"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            <i className={`${item.icon} w-5`}></i>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* User Profile & Settings */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
        {/* Theme Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600 dark:text-slate-400">Theme</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="h-8 w-8 p-0"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* User Info */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 nexTax-gradient rounded-full flex items-center justify-center">
            {user?.profileImageUrl ? (
              <img
                src={user.profileImageUrl}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <i className="fas fa-user text-white text-sm"></i>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
              {user?.firstName || user?.email?.split('@')[0] || 'User'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Free Plan</p>
          </div>
          <div className="flex space-x-1">
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Settings className="h-3 w-3" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0"
              onClick={handleLogout}
            >
              <LogOut className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
