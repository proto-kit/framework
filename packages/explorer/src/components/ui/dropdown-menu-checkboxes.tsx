"use client";

import { useEffect, useState } from "react";
import { DropdownMenuCheckboxItemProps } from "@radix-ui/react-dropdown-menu";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface DropdownMenuCheckboxesProps {
  label: string;
  icon?: JSX.Element;
  items: { value: string; label: string }[];
  onCheckedChange: (checked: string[]) => void;
}

export function DropdownMenuCheckboxes({
  label,
  icon,
  items,
  onCheckedChange,
}: DropdownMenuCheckboxesProps) {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(
    items.reduce((acc, item) => ({ ...acc, [item.value]: true }), {})
  );

  useEffect(() => {
    const checked = Object.entries(checkedItems)
      .filter(([, checked]) => checked)
      .map(([label]) => label);
    onCheckedChange(checked);
  }, [onCheckedChange, checkedItems]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex justify-between gap-1">
          {icon}
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>Columns</DropdownMenuLabel>
        {items.map((item, i) => (
          <DropdownMenuCheckboxItem
            key={i}
            checked={checkedItems?.[item.value]}
            onCheckedChange={(checked) =>
              setCheckedItems((checkedItems) => ({
                ...checkedItems,
                [item.value]: checked,
              }))
            }
          >
            {item.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
