import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useTheme } from "./ThemeProvider";
import { Menu, Moon, Sun, Rocket, MessageCircle, Route, FileText, Book, Settings, Shield } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
  currentSection: string;
  onSectionChange: (section: string) => void;
}

const navigationItems = [
  { id: "chat", label: "AI Chat", icon: MessageCircle },
  { id: "roadmap", label: "Progress Roadmap", icon: Route },
  { id: "documents", label: "Document Center", icon: FileText },
  { id: "knowledge", label: "Knowledge Hub", icon: Book },
  { id: "tools", label: "Startup Tools", icon: Settings },
  { id: "compliance", label: "Compliance", icon: Shield },
];

export function Layout({ children, currentSection, onSectionChange }: LayoutProps) {
  const { theme, setTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const handleSectionChange = (section: string) => {
    onSectionChange(section);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Mobile Header */}
      <header className="lg:hidden bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 nexTax-gradient rounded-lg flex items-center justify-center">
              <Rocket className="text-white" size={16} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-white">StartSmart</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">by NexTax.AI</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="p-2 bg-slate-100 dark:bg-slate-700"
            >
              {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
            </Button>
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2 bg-slate-100 dark:bg-slate-700"
                >
                  <Menu size={16} />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 nexTax-gradient rounded-xl flex items-center justify-center">
                      <Rocket className="text-white" />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-slate-900 dark:text-white">StartSmart</h1>
                      <p className="text-sm text-slate-500 dark:text-slate-400">by NexTax.AI</p>
                    </div>
                  </div>
                </div>
                <nav className="p-4 space-y-2">
                  {navigationItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSectionChange(item.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                        currentSection === item.id
                          ? "nexTax-gradient text-white"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      <item.icon size={20} />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex-col min-h-screen">
          {/* Logo Section */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 nexTax-gradient rounded-xl flex items-center justify-center">
                <Rocket className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">StartSmart</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">by NexTax.AI</p>
              </div>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 p-4 space-y-2">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  currentSection === item.id
                    ? "nexTax-gradient text-white"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 nexTax-gradient rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">JE</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-white">John Entrepreneur</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Free Plan</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
              </Button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-h-screen lg:min-h-0">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-4 py-2">
        <div className="flex items-center justify-around">
          {navigationItems.slice(0, 4).map((item) => (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`flex flex-col items-center py-2 px-3 transition-colors ${
                currentSection === item.id
                  ? "text-emerald-500"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              <item.icon size={20} />
              <span className="text-xs font-medium mt-1">{item.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
