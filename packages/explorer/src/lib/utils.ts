import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function typed<T>(v: any): T {
  return v;
}

type QuerySchema = Record<string, "string" | "number">;

type Where<T> = Record<string, { equals: T }>;

export function buildWhere<T extends string | number = string>(
  filters: Record<string, unknown> | undefined,
  schema?: QuerySchema
): Where<T> {
  const where: Where<T> = {};

  Object.entries(filters ?? {}).forEach(([key, value]) => {
    if (value == null || value === "") return;

    let parsed: string | number = String(value);

    if (schema?.[key] === "number") {
      parsed = Number(value);
    }
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    where[key] = { equals: parsed as T };
  });

  return where;
}
