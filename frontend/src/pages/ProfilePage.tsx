import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

interface Profile {
  id: string;
  display_name: string;
  bio: string;
  health_status: string;
  is_self: boolean;
  are_friends: boolean;
  can_view_details: boolean;
  friendship_status:
    | "self"
    | "friends"
    | "none"
    | "incoming_request"
    | "outgoing_request";
  pending_request_id: string | null;
  name: string | null;
  email: string | null;
  role: string | null;
  created_at: string | null;
}

interface FriendRequestItem {
  id: string;
  user_id: string;
  user_name: string;
  created_at: string;
}

interface FriendRequestsResponse {
  incoming: FriendRequestItem[];
  outgoing: FriendRequestItem[];
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { userId } = useParams();
  const targetId = userId ?? user?.id ?? null;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bioDraft, setBioDraft] = useState("");
  const [healthStatusDraft, setHealthStatusDraft] = useState("");
  const [requests, setRequests] = useState<FriendRequestsResponse>({
    incoming: [],
    outgoing: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!targetId) return;
    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      setError(null);
      try {
        const path =
          userId == null ? "/users/me/profile" : `/users/${targetId}/profile`;
        const profileRes = await api.get<Profile>(path);
        if (cancelled) return;
        setProfile(profileRes.data);
        setBioDraft(profileRes.data.bio);
        setHealthStatusDraft(profileRes.data.health_status);

        if (profileRes.data.is_self) {
          const requestsRes = await api.get<FriendRequestsResponse>(
            "/friends/requests"
          );
          if (!cancelled) {
            setRequests(requestsRes.data);
          }
        } else if (!cancelled) {
          setRequests({ incoming: [], outgoing: [] });
        }
      } catch {
        if (!cancelled) {
          setError("Unable to load this profile right now.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [targetId, userId]);

  async function refreshCurrentProfile() {
    if (!targetId) return;
    const path = userId == null ? "/users/me/profile" : `/users/${targetId}/profile`;
    const res = await api.get<Profile>(path);
    setProfile(res.data);
    setBioDraft(res.data.bio);
    setHealthStatusDraft(res.data.health_status);
  }

  async function refreshRequests() {
    if (!profile?.is_self) return;
    const res = await api.get<FriendRequestsResponse>("/friends/requests");
    setRequests(res.data);
  }

  async function handleSaveBio() {
    if (!profile?.is_self || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await api.patch<Profile>("/users/me/profile", {
        bio: bioDraft,
        health_status: healthStatusDraft,
      });
      setProfile(res.data);
      setBioDraft(res.data.bio);
      setHealthStatusDraft(res.data.health_status);
    } catch {
      setError("Unable to save your bio right now.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSendRequest() {
    if (!profile || acting) return;
    setActing(true);
    setError(null);
    try {
      await api.post(`/friends/requests/${profile.id}`);
      await refreshCurrentProfile();
    } catch {
      setError("Unable to send the friend request right now.");
    } finally {
      setActing(false);
    }
  }

  async function handleAcceptRequest(requestId: string) {
    if (acting) return;
    setActing(true);
    setError(null);
    try {
      await api.post(`/friends/requests/${requestId}/accept`);
      await refreshCurrentProfile();
      await refreshRequests();
    } catch {
      setError("Unable to accept the friend request right now.");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <div className="page profile-page">
        <p style={{ color: "var(--text-muted)" }}>Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page profile-page">
        <p style={{ color: "var(--danger)" }}>{error ?? "Profile not found."}</p>
      </div>
    );
  }

  return (
    <div className="page profile-page">
      <header className="page-header profile-header">
        <div>
          <h2>{profile.is_self ? "My Profile" : profile.display_name}</h2>
          <p>
            {profile.is_self
              ? "Share a little about yourself so others know how you are doing."
              : "Bio is always visible. Additional profile details are shared only with friends."}
          </p>
        </div>
        {!profile.is_self && (
          <div className="profile-actions">
            {profile.friendship_status === "none" && (
              <button className="btn-primary" onClick={handleSendRequest} disabled={acting}>
                Send Friend Request
              </button>
            )}
            {profile.friendship_status === "incoming_request" &&
              profile.pending_request_id && (
                <button
                  className="btn-primary"
                  onClick={() => handleAcceptRequest(profile.pending_request_id!)}
                  disabled={acting}
                >
                  Accept Request
                </button>
              )}
            {profile.friendship_status === "outgoing_request" && (
              <span className="profile-badge">Request sent</span>
            )}
            {profile.friendship_status === "friends" && (
              <span className="profile-badge">Friends</span>
            )}
          </div>
        )}
      </header>

      {error && <p className="profile-error">{error}</p>}

      <section className="profile-health-hero">
        <div className="profile-health-copy">
          <span className="profile-health-label">Health Status</span>
          <h3>
            {profile.is_self
              ? "Share the health experiences or challenges that matter to you."
              : "Shared health context"}
          </h3>
          <p>
            {profile.is_self
              ? "Use tags or short phrases so people who relate to your experience can find you more easily."
              : "This section stays visible even when the rest of the profile is private."}
          </p>
        </div>
        <div className="profile-health-value">
          {profile.is_self ? (
            <>
              <label className="profile-detail-label" htmlFor="health-status">
                Health tags
              </label>
              <input
                id="health-status"
                type="text"
                value={healthStatusDraft}
                onChange={(e) => setHealthStatusDraft(e.target.value)}
                placeholder="For example: anxiety, cancer, schizophrenia"
              />
            </>
          ) : (
            <>
              <span className="profile-detail-label">Visible to everyone</span>
              <strong>
                {profile.health_status || "No health status shared yet."}
              </strong>
            </>
          )}
        </div>
      </section>

      <div className="profile-grid">
        <section className="profile-card">
          <h3>Bio</h3>
          {profile.is_self ? (
            <>
              <textarea
                value={bioDraft}
                onChange={(e) => setBioDraft(e.target.value)}
                placeholder="Write about how you're feeling or anything you want others to know..."
                rows={6}
              />
              <button className="btn-primary" onClick={handleSaveBio} disabled={saving}>
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </>
          ) : (
            <>
              <p className="profile-bio">
                {profile.bio || "This user has not added a bio yet."}
              </p>
            </>
          )}
        </section>

        <section className="profile-card">
          <h3>Profile Details</h3>
          {profile.can_view_details ? (
            <div className="profile-details">
              <div>
                <span className="profile-detail-label">Name</span>
                <strong>{profile.name}</strong>
              </div>
              <div>
                <span className="profile-detail-label">Email</span>
                <strong>{profile.email}</strong>
              </div>
              <div>
                <span className="profile-detail-label">Role</span>
                <strong>{profile.role}</strong>
              </div>
              <div>
                <span className="profile-detail-label">Joined</span>
                <strong>
                  {profile.created_at
                    ? new Date(profile.created_at).toLocaleDateString()
                    : "-"}
                </strong>
              </div>
            </div>
          ) : (
            <p className="profile-privacy-note">
              More details about this user become visible once you are friends.
            </p>
          )}
        </section>
      </div>

      {profile.is_self && (
        <div className="profile-grid">
          <section className="profile-card">
            <h3>Incoming Requests</h3>
            {requests.incoming.length === 0 ? (
              <p className="profile-empty">No incoming requests right now.</p>
            ) : (
              <div className="profile-request-list">
                {requests.incoming.map((request) => (
                  <div key={request.id} className="profile-request-item">
                    <div>
                      <Link to={`/users/${request.user_id}`}>{request.user_name}</Link>
                      <p>Sent {new Date(request.created_at).toLocaleDateString()}</p>
                    </div>
                    <button
                      className="btn-primary btn-sm"
                      onClick={() => handleAcceptRequest(request.id)}
                      disabled={acting}
                    >
                      Accept
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="profile-card">
            <h3>Outgoing Requests</h3>
            {requests.outgoing.length === 0 ? (
              <p className="profile-empty">No outgoing requests right now.</p>
            ) : (
              <div className="profile-request-list">
                {requests.outgoing.map((request) => (
                  <div key={request.id} className="profile-request-item">
                    <div>
                      <Link to={`/users/${request.user_id}`}>{request.user_name}</Link>
                      <p>Sent {new Date(request.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className="profile-badge">Pending</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
