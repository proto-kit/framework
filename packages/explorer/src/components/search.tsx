import { Card } from "./ui/card";
import { Loader, LoaderCircle, Search as SearchIcon } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { FormField } from "./ui/form";
import { useFormContext } from "react-hook-form";

export interface SearchProps {
  loading: boolean;
  error: boolean;
}

export default function Search({ loading, error }: SearchProps) {
  const form = useFormContext();
  return (
    <div className="flex w-full flex-col h-full items-center justify-start gap-2 relative">
      <Card className="transition-all ease-in-out flex flex-grow items-center shadow-none min-h-[40px] w-[540px]">
        <FormField
          name="hash"
          control={form.control}
          render={({ field }) => (
            <Input
              {...field}
              name="hash"
              className=" h-full w-full mr-5 border-none focus-visible:ring-offset-0 focus-visible:ring-0 focus-visible:shadow-none rounded-r-none"
              placeholder="Search by block or transaction hash"
            />
          )}
        />

        <Button
          className="flex items-center rounded-l-none min-w-[120px]"
          disabled={loading}
          type="submit"
          form="search"
        >
          {loading ? (
            <>
              <LoaderCircle className="w-4 h-4 animate-spin" />
            </>
          ) : (
            <>
              <SearchIcon className="w-4 h-4 mr-1.5" />
              Search
            </>
          )}
        </Button>
      </Card>
      <p
        className={cn("text-destructive text-xs", {
          "opacity-0": !error,
        })}
      >
        No block or transaction found with the specified hash.
      </p>
    </div>
  );
}
