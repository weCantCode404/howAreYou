"use client";

import { useEffect, useState, useCallback } from "react";
import { MessageSquare } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSkeleton,
  SidebarFooter,
} from "@/components/ui/sidebar";

function groupByDate(items) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups = { Today: [], Yesterday: [], "Past 7 Days": [], Earlier: [] };

  for (const item of items) {
    const date = new Date(item.timestamp || item.created_at || Date.now());
    if (date >= today) groups["Today"].push(item);
    else if (date >= yesterday) groups["Yesterday"].push(item);
    else if (date >= weekAgo) groups["Past 7 Days"].push(item);
    else groups["Earlier"].push(item);
  }

  return Object.entries(groups).filter(([, items]) => items.length > 0);
}

function getPreview(item) {
  return (
    item.message ||
    item.summary ||
    item.user_message ||
    "Conversation"
  );
}

export default function AppSidebar({ userId, onSelectConversation }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/history/${userId}?limit=20`);
      if (res.ok) {
        const data = await res.json();
        setHistory(Array.isArray(data) ? data : []);
      }
    } catch {
      /* silently fail — sidebar is non-critical */
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const grouped = groupByDate(history);

  return (
    <Sidebar collapsible="offcanvas" className="border-r border-border-subtle">
      <SidebarHeader className="px-4 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-white text-sm font-bold">W</span>
          </div>
          <span className="text-base font-semibold text-dark">WellCheck</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {loading ? (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SidebarMenuItem key={i}>
                    <SidebarMenuSkeleton showIcon />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : grouped.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-text-muted">No conversations yet</p>
            <p className="text-xs text-text-muted mt-1">Start a check-in to begin</p>
          </div>
        ) : (
          grouped.map(([label, items]) => (
            <SidebarGroup key={label}>
              <SidebarGroupLabel className="text-xs font-medium text-text-muted uppercase tracking-wider px-4">
                {label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item, i) => (
                    <SidebarMenuItem key={item.id || item.session_id || i}>
                      <SidebarMenuButton
                        onClick={() => onSelectConversation?.(item)}
                        className="px-4"
                      >
                        <MessageSquare className="shrink-0 text-text-muted" size={16} />
                        <span className="truncate text-sm text-text-secondary">
                          {getPreview(item)}
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))
        )}
      </SidebarContent>

      <SidebarFooter className="px-4 py-3">
        <p className="text-xs text-text-muted text-center">
          Powered by WellCheck GH
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
