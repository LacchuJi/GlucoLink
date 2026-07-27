"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { ProfileMenu } from "@/components/profile-menu";

type AppHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  unreadCount?: number;
  onNotificationClick?: () => void;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  userInitials?: string;
};

export function AppHeader({
  eyebrow,
  title,
  description,
  unreadCount = 0,
  onNotificationClick,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
  userInitials = "SA"
}: AppHeaderProps) {
  return (
    <header>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="sub">{description}</p>
      </div>

      <div className="header-actions">
        {secondaryActionLabel && onSecondaryAction && (
          <button className="outline-button" onClick={onSecondaryAction}>
            {secondaryActionLabel}
          </button>
        )}

        {primaryActionLabel && onPrimaryAction && (
          <button className="submit" onClick={onPrimaryAction} style={{ width: "auto", margin: 0, padding: "9px 16px" }}>
            {primaryActionLabel}
          </button>
        )}

        <ThemeToggle />

        <button
          className="icon-btn"
          onClick={onNotificationClick}
          aria-label="Notifications"
          style={{ cursor: "pointer" }}
        >
          ♧
          {unreadCount > 0 && <b style={{ background: "#ef4444" }}></b>}
        </button>

        <ProfileMenu defaultInitials={userInitials} />
      </div>
    </header>
  );
}
