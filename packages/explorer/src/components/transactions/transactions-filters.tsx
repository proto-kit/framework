import { useFormContext } from "react-hook-form";
import { PopoverClose } from "@radix-ui/react-popover";

import { Button } from "../ui/button";

import FilterBuilder, { FilterFieldDef } from "@/components/ui/FilterBuilder";

export interface TransactionsFiltersProps {
  clearFilters: () => void;
}

const fields: FilterFieldDef[] = [
  { name: "hash", label: "Hash", type: "string", placeholder: "Filter by hash" },
  { name: "methodId", label: "Method ID", type: "string", placeholder: "Filter by method ID" },
  { name: "sender", label: "Sender", type: "string", placeholder: "Filter by sender" },
];

export default function TransactionsFilters({ clearFilters }: TransactionsFiltersProps) {
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
