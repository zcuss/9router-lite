export function validateBody(schema: any, data: any) {
  const result = schema.safeParse(data);
  if (result.success) {
    return { error: null, data: result.data };
  }
  return {
    error: result.error.format(),
    data: null,
  };
}

export function isValidationFailure(result: any) {
  return !!result.error;
}
