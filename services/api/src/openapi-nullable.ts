/** OAS 3.0 has no null type. Only generated documentation is converted; HTTP serializers stay unchanged. */
export function openApi30Nulls<T>(value: T): T {
  if (Array.isArray(value)) return value.map(item => openApi30Nulls(item)) as T;
  if (value !== null && typeof value === "object") {
    const object = value as Record<string, unknown>;
    if (object.type === "null") return { ...object, type: "object", nullable: true, enum: [null] } as T;
    return Object.fromEntries(Object.entries(object).map(([key, item]) => [key, openApi30Nulls(item)])) as T;
  }
  return value;
}
