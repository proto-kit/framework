import { PopoverClose } from "@radix-ui/react-popover";
import React from "react";
import { useFormContext } from "react-hook-form";

import { Button } from "./button";

import FilterBuilder, { FilterFieldDef } from "@/components/ui/FilterBuilder";

export interface FiltersProps {
  fields: FilterFieldDef[];
  applyLabel?: string;
  onSubmit?: () => void | Promise<void>;
}

export default function Filters({
  fields,
  applyLabel,
  onSubmit,
}: FiltersProps) {
  const form = useFormContext();

  const handleClear = async () => {
    for (const f of fields) {
      const val = f.initialValue ?? (f.type === "boolean" ? false : "");
      form.setValue(f.name, val);
    }
    await form.trigger();
    if (onSubmit) {
      await onSubmit();
    }
  };

  return (
    <>
      <FilterBuilder fields={fields} />
      <div className="flex items-center justify-between mt-6">
        <PopoverClose asChild>
          <Button variant={"outline"} onClick={handleClear}>
            Clear filters
          </Button>
        </PopoverClose>
        <PopoverClose asChild>
          <Button form="table" type="submit">
            {applyLabel ?? "Apply filters"}
          </Button>
        </PopoverClose>
      </div>
    </>
  );
}
