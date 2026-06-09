import { useEffect, useState } from "react";

export function useAvailableModels(providerId: string | undefined) {
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!providerId) {
      setModels([]);
      return;
    }

    let mounted = true;
    setLoading(true);

    fetch(`/api/providers/${providerId}/models`)
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return;
        const list = Array.isArray(data?.models) ? data.models : [];
        setModels(list.map((m: any) => ({
          id: m.id,
          name: m.name || m.id,
        })));
      })
      .catch(() => {
        if (mounted) setModels([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [providerId]);

  return { models, availableModels: models, loading };
}
