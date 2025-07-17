interface MobileNavProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function MobileNav({ activeSection, onSectionChange }: MobileNavProps) {
  const navItems = [
    { key: "home", icon: "fas fa-home", label: "Home" },
    { key: "chat", icon: "fas fa-comments", label: "Chat" },
    { key: "roadmap", icon: "fas fa-route", label: "Progress" },
    { key: "documents", icon: "fas fa-file-alt", label: "Docs" },
    { key: "knowledge", icon: "fas fa-book", label: "Learn" },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-4 py-2 z-40">
      <div className="flex items-center justify-around">
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => onSectionChange(item.key)}
            className={`flex flex-col items-center py-2 px-3 transition-colors ${
              activeSection === item.key
                ? "text-[hsl(174,73%,53%)]"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            <i className={`${item.icon} text-lg mb-1`}></i>
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
