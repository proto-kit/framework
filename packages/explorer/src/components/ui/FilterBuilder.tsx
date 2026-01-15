import { useFormContext } from "react-hook-form";

import { Input } from "./input";
import { Checkbox } from "./checkbox";
import { Label } from "./label";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";

export type FilterFieldType = "string" | "number" | "boolean";

export interface FilterFieldDef {
  name: string;
  label: string;
  type: FilterFieldType;
  placeholder?: string;
  initialValue?: string | boolean;
}

export interface FilterBuilderProps {
  fields: FilterFieldDef[];
}

export default function FilterBuilder({ fields }: FilterBuilderProps) {
  const form = useFormContext();

  return (
    <div className="flex flex-col gap-3">
      {fields.map((f) => (
        <FormField
          key={f.name}
          name={f.name}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{f.label}</FormLabel>
              <FormControl>
                {f.type === "boolean" ? (
                  <div className="flex items-center gap-2 mt-2">
                    <Checkbox
                      id={f.name}
                      checked={Boolean(field.value)}
                      onCheckedChange={(v) => field.onChange(v)}
                      name={f.name}
                    />
                    <Label htmlFor={f.name}>{f.placeholder ?? f.label}</Label>
                  </div>
                ) : (
                  <Input
                    ref={field.ref}
                    name={f.name}
                    inputMode={f.type === "number" ? "numeric" : undefined}
                    pattern={f.type === "number" ? "[0-9]*" : undefined}
                    placeholder={
                      f.placeholder ?? `Filter by ${f.label.toLowerCase()}`
                    }
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    value={field.value ?? ""}
                    onChange={(e) => {
                      if (f.type === "number") {
                        const cleaned = e.target.value.replace(/\D+/g, "");
                        field.onChange(cleaned);
                      } else {
                        field.onChange(e.target.value);
                      }
                    }}
                    onPaste={(e) => {
                      if (f.type === "number") {
                        const text = e.clipboardData.getData("text");
                        if (!/^\d+$/.test(text)) {
                          e.preventDefault();
                        }
                      }
                    }}
                  />
                )}
              </FormControl>
            </FormItem>
          )}
        />
      ))}
    </div>
  );
}
