export function Select({ value, onValueChange, children, className = "" }) {
  const optionChildren = flattenOptions(children);

  return (
    <select
      value={value}
      onChange={(event) => onValueChange?.(event.target.value)}
      className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {optionChildren}
    </select>
  );
}

function flattenOptions(children) {
  if (!Array.isArray(children)) {
    return children?.props?.children || null;
  }

  return children.flatMap((child) => {
    if (!child) return [];
    if (child.type === SelectContent) return child.props.children;
    if (child.type === SelectTrigger) return [];
    return child;
  });
}

export function SelectContent({ children }) {
  return children;
}

export function SelectItem({ value, children }) {
  return <option value={value}>{children}</option>;
}

export function SelectTrigger() {
  return null;
}

export function SelectValue() {
  return null;
}
