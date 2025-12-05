import Link from "next/link";
import { ThemeToggle } from "../ui/theme-toggle";

const NAV_ITEMS = [
  { name: "상품", href: "/rankings", active: true },
  { name: "검색어", href: "#", active: false },
  { name: "기사", href: "#", active: false },
  { name: "커뮤니티", href: "#", active: false },
];

export function Header() {
  return (
    <header className="border-b">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">
          <span className="text-primary">Pick</span>Trend
        </Link>
        <nav className="flex items-center gap-6">
          {NAV_ITEMS.map((item) =>
            item.active ? (
              <Link
                key={item.name}
                href={item.href}
                className="text-muted-foreground hover:text-foreground transition"
              >
                {item.name}
              </Link>
            ) : (
              <span
                key={item.name}
                className="text-muted-foreground/50 cursor-not-allowed relative group"
                title="Coming Soon"
              >
                {item.name}
                <span className="absolute -top-1 -right-2 text-[10px] text-primary">*</span>
              </span>
            )
          )}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
