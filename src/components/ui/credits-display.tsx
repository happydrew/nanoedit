"use client";

import { Coins } from "lucide-react";

interface CreditsDisplayProps {
  credits: number;
  className?: string;
}

export default function CreditsDisplay({ credits, className = "" }: CreditsDisplayProps) {
  return (
    <span className={`flex items-center gap-1 ${className}`}>
      <Coins className="w-4 h-4" />
      {credits}
    </span>
  );
}