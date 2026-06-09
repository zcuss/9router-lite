import { useEffect, useState } from "react";

export function useProviderOptions(initialProvider = "") {
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState(initialProvider);

  useEffect(() => {
    let mounted = true;
    fetch("/api/providers")
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return;
        const providers = Array.isArray(data?.connections) ? data.connections : Array.isArray(data?.providers) ? data.providers : [];
        setOptions(providers.map((provider: any) => ({
          value: provider.id || provider.provider || provider.name,
          label: provider.name || provider.provider || provider.id,
          provider,
        })));
      })
      .catch(() => {
        if (mounted) setOptions([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { options, providerOptions: options, loading, provider, setProvider };
}
