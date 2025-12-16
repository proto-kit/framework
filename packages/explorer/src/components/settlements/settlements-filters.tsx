import { PopoverClose } from "@radix-ui/react-popover";

import { Button } from "../ui/button";

import FilterBuilder, { FilterFieldDef } from "@/components/ui/FilterBuilder";

export interface SettlementsFiltersProps {
  clearFilters: () => void;
}

const fields: FilterFieldDef[] = [
  {
    name: "transactionHash",
    label: "Transaction Hash",
    type: "string",
    placeholder: "Filter by transaction hash",
  },
  {
    name: "promisedMessagesHash",
    label: "Promised Messages Hash",
    type: "string",
    placeholder: "Filter by promised messages hash",
  },
];

export default function BlocksFilters({
  clearFilters,
}: SettlementsFiltersProps) {
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
