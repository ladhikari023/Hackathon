import { useState, useEffect } from "react";
import api from "../api/client";

interface Therapist {
  id: string;
  name: string;
  specialization: string;
  languages: string;
  bio: string;
}

export default function TherapistsPage() {
  const [therapists, setTherapists] = useState<Therapist[]>([]);

  useEffect(() => {
    api
      .get("/therapists")
      .then((res) => setTherapists(res.data))
      .catch(() => {});
  }, []);

  return (
    <div className="page therapists-page">
      <header className="page-header">
        <h2>Find a Therapist</h2>
        <p>Connect with mental health professionals</p>
      </header>

      <div className="therapist-grid">
        {therapists.map((t) => (
          <div key={t.id} className="therapist-card">
            <div className="therapist-avatar">
              {t.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </div>
            <h3>{t.name}</h3>
            <span className="specialization">{t.specialization}</span>
            <p className="bio">{t.bio}</p>
            <p className="languages">🌐 {t.languages}</p>
            <button className="btn-outline">Book Session</button>
          </div>
        ))}
      </div>
    </div>
  );
}
