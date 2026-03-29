import { useEffect, useState } from "react";
import api from "../api/client";

interface TherapistSettings {
  id: string;
  name: string;
  specialization: string;
  languages: string;
  bio: string;
  intro_message_price_cents: number;
  intro_message_is_free: boolean;
}

export default function TherapistSettingsPage() {
  const [settings, setSettings] = useState<TherapistSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/therapists/me/settings")
      .then((res) => setSettings(res.data))
      .catch(() => setStatus("Unable to load therapist settings right now."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page">
        <p style={{ color: "var(--text-muted)" }}>Loading settings...</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="page">
        <p style={{ color: "var(--danger)" }}>
          {status ?? "Therapist settings were not found."}
        </p>
      </div>
    );
  }

  return (
    <div className="page profile-page">
      <header className="page-header">
        <h2>Therapist Settings</h2>
        <p>Manage your public therapist profile and intro-message pricing.</p>
      </header>

      <section className="profile-card">
        <label className="profile-detail-label" htmlFor="therapist-specialization">
          Specialization
        </label>
        <input
          id="therapist-specialization"
          value={settings.specialization}
          onChange={(e) =>
            setSettings((prev) =>
              prev ? { ...prev, specialization: e.target.value } : prev
            )
          }
        />

        <label className="profile-detail-label" htmlFor="therapist-languages">
          Languages
        </label>
        <input
          id="therapist-languages"
          value={settings.languages}
          onChange={(e) =>
            setSettings((prev) => (prev ? { ...prev, languages: e.target.value } : prev))
          }
        />

        <label className="profile-detail-label" htmlFor="therapist-bio">
          Bio
        </label>
        <textarea
          id="therapist-bio"
          value={settings.bio}
          onChange={(e) =>
            setSettings((prev) => (prev ? { ...prev, bio: e.target.value } : prev))
          }
          rows={6}
        />

        <label className="profile-detail-label" htmlFor="therapist-price">
          Initial Message Price (USD)
        </label>
        <input
          id="therapist-price"
          type="number"
          min="0"
          step="0.01"
          value={(settings.intro_message_price_cents / 100).toFixed(2)}
          onChange={(e) => {
            const cents = Math.max(0, Math.round(Number(e.target.value || "0") * 100));
            setSettings((prev) =>
              prev
                ? {
                    ...prev,
                    intro_message_price_cents: cents,
                    intro_message_is_free: cents === 0,
                  }
                : prev
            );
          }}
        />
        <p style={{ color: "var(--text-muted)" }}>
          Set this to `0.00` if you want the initial intro message to be free.
        </p>

        <button
          className="btn-primary"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            setStatus(null);
            try {
              const res = await api.patch("/therapists/me/settings", {
                specialization: settings.specialization,
                languages: settings.languages,
                bio: settings.bio,
                intro_message_price_cents: settings.intro_message_price_cents,
              });
              setSettings(res.data);
              setStatus("Therapist settings saved.");
            } catch {
              setStatus("Unable to save therapist settings right now.");
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>

        {status ? <p className="therapist-intro-status">{status}</p> : null}
      </section>
    </div>
  );
}
