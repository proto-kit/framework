import { PopoverClose } from "@radix-ui/react-popover";

import { Button } from "../ui/button";

import FilterBuilder, { FilterFieldDef } from "@/components/ui/FilterBuilder";

export interface BatchesFiltersProps {
  clearFilters: () => void;
}

const fields: FilterFieldDef[] = [
  {
    name: "height",
    label: "Height",
    type: "number",
    placeholder: "Filter by height",
  },
  {
    name: "settlementTransactionHash",
    label: "Settlement transaction hash",
    type: "string",
    placeholder: "Filter by settlement tx hash",
  },
];

export default function BlocksFilters({ clearFilters }: BatchesFiltersProps) {
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
