/* eslint-disable no-nested-ternary */
import { ExternalLink } from "lucide-react";
import Link from "next/link";

import { Skeleton } from "../ui/skeleton";
import CopyToClipboard from "../ui/copy-to-clipboard";

import { cn } from "@/lib/utils";

export interface DetailsLayoutProps {
  title: string | JSX.Element;
  children: JSX.Element;
  details: {
    label: string;
    value: string | JSX.Element;
    link?: string;
  }[];
  loading: boolean;
}

export function DetailsLayout({
  children,
  title,
  details,
  loading,
}: DetailsLayoutProps) {
  return (
    <div className="flex flex-col justify-center items-center h-full">
      <div className="flex flex-col w-full items-center justify-center">
        {/* Heading */}
        <div className="flex w-full justify-between items-center">
          <div className="flex items-center gap-3 w-full justify-between">
            <h1 className="scroll-m-20 w-full text-4xl font-extrabold tracking-tight lg:text-5xl">
              {title}
            </h1>
          </div>
        </div>

        {/* Details */}
        <div className="flex justify-start w-full mb-2 mt-6 flex-wrap">
          {details.map((detail, i) => (
            <div className="min-w-[50px] mr-12 mb-6" key={detail.label}>
              <Link
                href={detail.link ?? ""}
                className={cn({
                  "pointer-events-none": detail.link != null,
                })}
              >
                <p className="text-xs font-semibold text-muted-foreground flex gap-1 items-center">
                  {detail.label}
                  {detail.link != null && detail.link !== "" && (
                    <ExternalLink className="w-3 h-3 relative -top-0.5" />
                  )}
                </p>
                {!loading ? (
                  String(detail.value).length > 50 ? (
                    <CopyToClipboard text={String(detail.value)} />
                  ) : (
                    detail.value
                  )
                ) : (
                  <Skeleton className="h-6 relative top-1" />
                )}
              </Link>
            </div>
          ))}
        </div>

        {children}
      </div>
    </div>
  );
}
/* eslint-enable no-nested-ternary */
