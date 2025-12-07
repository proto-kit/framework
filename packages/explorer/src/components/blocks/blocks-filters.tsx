import { useFormContext } from "react-hook-form";
import { PopoverClose } from "@radix-ui/react-popover";

import { Button } from "../ui/button";

import FilterBuilder, { FilterFieldDef } from "@/components/ui/FilterBuilder";

export interface BlocksFiltersProps {
  clearFilters: () => void;
}

const fields: FilterFieldDef[] = [
  { name: "height", label: "Height", type: "number", placeholder: "Filter by height" },
  { name: "hash", label: "Hash", type: "string", placeholder: "Filter by hash" },
  { name: "hideEmpty", label: "Hide empty blocks", type: "boolean", placeholder: "Hide empty blocks" },
];

export default function BlocksFilters({ clearFilters }: BlocksFiltersProps) {
  const form = useFormContext();
  const handleClearFilters = clearFilters;

  return (
    <>
      <FilterBuilder fields={fields} />
      <div className="flex items-center justify-between mt-6">
        <PopoverClose asChild onClick={handleClearFilters}>
          <Button variant={"outline"}>Clear filters</Button>
        </PopoverClose>
        <PopoverClose asChild>
          <Button form="table" type="submit">
            Apply filters
          </Button>
        </PopoverClose>
      </div>
    </>
  );
}
