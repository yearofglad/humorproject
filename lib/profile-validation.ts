export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

export function validateNames(first: FormDataEntryValue | null, last: FormDataEntryValue | null) {
  if (typeof first !== "string" || typeof last !== "string") return null;
  const firstName = first.trim();
  const lastName = last.trim();
  if (!firstName || !lastName || firstName.length > 80 || lastName.length > 80) return null;
  return { first_name: firstName, last_name: lastName };
}
