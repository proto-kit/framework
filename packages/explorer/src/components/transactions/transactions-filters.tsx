import { useFormContext } from "react-hook-form";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { useCallback } from "react";
import { PopoverClose } from "@radix-ui/react-popover";

export interface TransactionsFiltersProps {
  clearFilters: () => void;
}

export default function TransactionsFilters({
  clearFilters,
}: TransactionsFiltersProps) {
  const form = useFormContext();
  const handleClearFilters = clearFilters;

  return (
    <>
      <div className="flex flex-col gap-3">
        <FormField
          name="hash"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hash</FormLabel>
              <FormControl>
                <Input {...field} name="hash" placeholder="Filter by hash" />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          name="methodId"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Method ID</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  name="methodId"
                  placeholder="Filter by method ID"
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          name="sender"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sender</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  name="sender"
                  placeholder="Filter by sender"
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* <FormField
          name="hideFailingTransactions"
          control={form.control}
          render={({ field }) => {
            console.log("field", field.value);
            return (
              <FormItem>
                <FormControl>
                  <div className="flex gap-2 mt-2">
                    <Checkbox
                      id="hideFailingTransactions"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      name="hideFailingTransactions"
                    />
                    <Label htmlFor="hideFailingTransactions">
                      Hide failing transactions
                    </Label>
                  </div>
                </FormControl>
              </FormItem>
            );
          }}
        /> */}
      </div>
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
