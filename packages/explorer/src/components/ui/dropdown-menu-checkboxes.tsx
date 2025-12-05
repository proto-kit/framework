"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
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
      .filter(([, _checked]) => _checked)
      .map(([_label]) => _label);
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
              setCheckedItems((_checkedItems) => ({
                ..._checkedItems,
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
