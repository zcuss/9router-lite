"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, Button, Input, Select } from "@/shared/components";
import { Toaster, toast } from "sonner";

const LOCAL_DRIVER_VALUE = "local";
const REMOTE_DRIVER_VALUES = new Set(["postgres", "cockroach"]);
const FOOTER_COPY = {
  idle: "Setelah menyimpan konfigurasi baru, server akan mencoba restart otomatis. Jika dijalankan di mode dev, reload manual tidak perlu.",
  dirty: "Perubahan belum disimpan.",
};

export default function DatabaseSettings() {
  const [dbDriver, setDbDriver] = useState(LOCAL_DRIVER_VALUE);
  const [databaseUrl, setDatabaseUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [savedSnapshot, setSavedSnapshot] = useState({ dbDriver: LOCAL_DRIVER_VALUE, databaseUrl: "" });

  const normalizedDriver = useMemo(() => {
    const next = (dbDriver || LOCAL_DRIVER_VALUE).toLowerCase();
    return REMOTE_DRIVER_VALUES.has(next) ? next : LOCAL_DRIVER_VALUE;
  }, [dbDriver]);

  const hasRemoteConfig = normalizedDriver !== LOCAL_DRIVER_VALUE;

  useEffect(() => {
    let mounted = true;

    async function loadConfig() {
      try {
        const response = await fetch("/api/settings/database/config", { cache: "no-store" });
        const result = await response.json();
        if (!mounted) return;

        if (result.success) {
          const nextDriver = REMOTE_DRIVER_VALUES.has((result.DB_DRIVER || "").toLowerCase()) ? result.DB_DRIVER.toLowerCase() : LOCAL_DRIVER_VALUE;
          const nextUrl = result.DATABASE_URL || "";
          setDbDriver(nextDriver);
          setDatabaseUrl(nextUrl);
          setSavedSnapshot({ dbDriver: nextDriver, databaseUrl: nextUrl });
        } else {
          toast.error(result.error || "Gagal membaca konfigurasi database");
        }
      } catch (error) {
        if (mounted) toast.error("Gagal membaca konfigurasi database: " + error.message);
      } finally {
        if (mounted) setInitialLoading(false);
      }
    }

    loadConfig();
    return () => { mounted = false; };
  }, []);

  const refreshConfig = async () => {
    const response = await fetch("/api/settings/database/config", { cache: "no-store" });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || "Gagal memuat konfigurasi terbaru");
    const nextDriver = REMOTE_DRIVER_VALUES.has((result.DB_DRIVER || "").toLowerCase()) ? result.DB_DRIVER.toLowerCase() : LOCAL_DRIVER_VALUE;
    const nextUrl = result.DATABASE_URL || "";
    setDbDriver(nextDriver);
    setDatabaseUrl(nextUrl);
    setSavedSnapshot({ dbDriver: nextDriver, databaseUrl: nextUrl });
  };

  const handleTestConnect = async () => {
    if (!databaseUrl && hasRemoteConfig) {
      toast.error("Masukkan URL database terlebih dahulu");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/settings/database/test-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ DATABASE_URL: databaseUrl, DB_DRIVER: normalizedDriver }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success("Koneksi berhasil!");
      } else {
        toast.error(result.error || "Koneksi gagal");
      }
    } catch (error) {
      toast.error("Koneksi gagal: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!databaseUrl && hasRemoteConfig) {
      toast.error("Masukkan URL database terlebih dahulu");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/settings/database/save-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ DATABASE_URL: databaseUrl, DB_DRIVER: normalizedDriver }),
      });
      const result = await response.json();
      if (result.success) {
        setSavedSnapshot({ dbDriver: normalizedDriver, databaseUrl });
        toast.success("Konfigurasi tersimpan. Runtime membaca env aktif langsung.");
        try {
          await refreshConfig();
          toast.success("Config aktif tersinkron tanpa reload manual.");
        } catch (refreshError) {
          toast.error("Tersimpan, tapi gagal refresh config aktif: " + refreshError.message);
        }
      } else {
        toast.error(result.error || "Gagal menyimpan konfigurasi");
      }
    } catch (error) {
      toast.error("Gagal menyimpan konfigurasi: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const driverOptions = [
    { value: "local", label: "Lokal (SQL.js)" },
    { value: "postgres", label: "PostgreSQL" },
    { value: "cockroach", label: "CockroachDB" },
  ];

  const isDirty = savedSnapshot.dbDriver !== normalizedDriver || savedSnapshot.databaseUrl !== databaseUrl;
  const shouldShowDatabaseUrl = normalizedDriver !== LOCAL_DRIVER_VALUE;

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <Toaster richColors />
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-[10px] bg-surface border border-border-subtle text-text-muted">
          <span className="material-symbols-outlined text-[24px]">storage</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-main">Pengaturan Database</h1>
          <p className="text-sm text-text-muted">Konfigurasi penyimpanan data aplikasi</p>
        </div>
      </div>

      <Card title="Konfigurasi Database" icon="dns">
        <div className="space-y-4">
          {initialLoading && (
            <div className="text-sm text-text-muted">Membaca konfigurasi database dari env...</div>
          )}

          <Select
            label="Driver Database"
            options={driverOptions}
            value={normalizedDriver}
            onChange={(e) => setDbDriver(e.target.value)}
          />

          {shouldShowDatabaseUrl && (
            <Input
              label="URL Database"
              type="text"
              placeholder="postgresql://user:***@host:5432/dbname"
              value={databaseUrl}
              onChange={(e) => setDatabaseUrl(e.target.value)}
              hint="Nilai awal otomatis diambil dari env runtime yang sedang aktif"
            />
          )}

          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={handleTestConnect}
              loading={loading || initialLoading}
            >
              Tes Koneksi
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveConfig}
              loading={loading || initialLoading}
            >
              Simpan Konfigurasi
            </Button>
          </div>

          <div className="text-xs text-text-muted border-t border-border-subtle pt-4 mt-4 space-y-1">
            <p><strong>Catatan:</strong> Nilai driver dan URL di halaman ini langsung dibaca dari env runtime.</p>
            <p>{FOOTER_COPY.idle}</p>
            {isDirty && <p className="text-amber-500">{FOOTER_COPY.dirty}</p>}
          </div>
        </div>
      </Card>
    </div>
  );
}
