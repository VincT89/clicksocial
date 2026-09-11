import React from "react";
import { Link } from "react-router-dom";
import Logo from "@/components/Logo";

export default function BrandLink({ subtitle = "" }) {
  return (
    <Link to="/" aria-label="ClickSocial, home" className="flex min-h-11 min-w-0 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-3">
      <Logo className="w-8 h-8 sm:w-9 sm:h-9 shrink-0" />
      <div className="min-w-0">
        <p className="font-heading text-[15px] sm:text-lg tracking-tight leading-none">
          <span className="font-medium text-foreground/70">Click</span>
          <strong className="text-foreground">Social</strong>
        </p>
        {subtitle && <p className="truncate text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </Link>
  );
}
