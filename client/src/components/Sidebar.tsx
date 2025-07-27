import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@shared/schema";
import {
  Eye,
  Upload,
  BarChart3,
  Users,
  Settings,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Upload Logs", href: "/upload", icon: Upload },
  { name: "Reports", href: "/reports", icon: Eye },
  { name: "Users", href: "/users", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth() as { user: User | undefined };

  return (
    <div className="w-64 bg-card shadow-lg border-r flex flex-col">
      <div className="p-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Eye className="text-primary-foreground" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Take a Look</h1>
            <p className="text-sm text-muted-foreground">Log Analysis System</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <li key={item.name}>
                <Link href={item.href}>
                  <a className={cn("nav-item", isActive && "active")}>
                    <Icon size={18} />
                    <span>{item.name}</span>
                  </a>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10">
              <AvatarImage 
                src={user?.profileImageUrl || ""} 
                alt={`${user?.firstName} ${user?.lastName}`}
              />
              <AvatarFallback>
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-foreground">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {user?.role || 'Viewer'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.href = "/api/logout"}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
