import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  BarChart2, 
  Image as ImageIcon, 
  Activity,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "首页", href: "/", icon: LayoutDashboard },
  { name: "数据管理", href: "/patients", icon: Users },
  { name: "统计分析", href: "/statistics", icon: BarChart2 },
  { name: "治疗结果分析", href: "/survival", icon: TrendingUp },
  { name: "影像资料", href: "/imaging", icon: ImageIcon },
  { name: "影像组学", href: "/radiomics", icon: Activity },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="flex h-full w-64 flex-col bg-sidebar border-r border-sidebar-border">
      <div className="flex h-16 shrink-0 items-center px-6 bg-sidebar-primary text-sidebar-primary-foreground">
        <Activity className="h-6 w-6 mr-2" />
        <span className="font-semibold tracking-tight text-lg">CervicalCancer DB</span>
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto py-4">
        <nav className="flex-1 space-y-1 px-3">
          {navigation.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                  "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors"
                )}
              >
                <item.icon
                  className={cn(
                    isActive ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground",
                    "mr-3 h-5 w-5 flex-shrink-0"
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex shrink-0 border-t border-sidebar-border p-4">
        <button className="group block w-full flex-shrink-0">
          <div className="flex items-center">
            <div>
              <div className="inline-block h-9 w-9 rounded-full bg-sidebar-accent text-sidebar-accent-foreground flex items-center justify-center">
                <span className="text-sm font-medium">DR</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-sidebar-foreground group-hover:text-sidebar-accent-foreground">
                研究员 (Admin)
              </p>
              <p className="text-xs font-medium text-sidebar-foreground/70 group-hover:text-sidebar-foreground">
                查看配置
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
