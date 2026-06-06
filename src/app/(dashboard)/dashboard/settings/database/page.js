"use client";

import { useEffect, useState } from "react";
import { Card, Button, Input, Select } from "@/shared/components";
import { Toaster, toast } from "sonner";

export default function DatabaseSettings() {
  const [dbDriver, setDbDriver] = useState("local");
  const [databaseUrl, setDatabaseUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadConfig() {
      try {
        const response = await fetch("/api/settings/database/config");
        const result = await response.json();
        if (!mounted) return;

        if (result.success) {
          setDbDriver(result.DB_DRIVER || "local");
          setDatabaseUrl(result.DATABASE_URL || "");
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

  const handleTestConnect = async () => {
    if (!databaseUrl && dbDriver !== "local") {
      toast.error("Masukkan URL database terlebih dahulu");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/settings/database/test-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ DATABASE_URL: databaseUrl, DB_DRIVER: dbDriver }),
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
    if (!databaseUrl && dbDriver !== "local") {
      toast.error("Masukkan URL database terlebih dahulu");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/settings/database/save-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ DATABASE_URL: databaseUrl, DB_DRIVER: dbDriver }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success("Konfigurasi berhasil disimpan! Server akan restart otomatis...");
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
            value={dbDriver}
            onChange={(e) => setDbDriver(e.target.value)}
          />

          {dbDriver !== "local" && (
            <Input
              label="URL Database"
              type="text"
              placeholder="postgresql://user:password@host:5432/dbname"
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
            <p>Setelah menyimpan konfigurasi baru, server akan mencoba restart otomatis. Jika dijalankan manual tanpa CLI manager, jalankan ulang aplikasi secara manual.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
