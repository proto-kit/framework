"use client";

import { Clipboard, ClipboardCheck } from "lucide-react";
import { useState } from "react";
import Truncate from "react-truncate-inside/es";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CopyProps {
  text?: string;
}

export default function CopyToClipboard({ text }: CopyProps) {
  const [copied, setCopied] = useState(false);

  const copy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();

    if (text == null) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  if (text == null) return <>-</>;

  return (
    <div className="flex items-center">
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger>
            <button
              type="button"
              onClick={copy}
              className="p-1 rounded hover:bg-muted transition"
            >
              {copied ? (
                <ClipboardCheck className="w-4 h-4" />
              ) : (
                <Clipboard className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          </TooltipTrigger>

          <TooltipContent side="top" align="center">
            {copied ? "Copied successfully!" : "Click to copy"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Truncate text={text} width={150} />
    </div>
  );
}
