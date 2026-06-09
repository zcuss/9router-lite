function emptyStmt() {
  return {
    get: () => ({ count: 0 }),
    all: () => [],
    run: () => ({ changes: 0 }),
  };
}

export function getDbInstance() {
  return {
    prepare: (query?: string) => emptyStmt(),
  };
}
