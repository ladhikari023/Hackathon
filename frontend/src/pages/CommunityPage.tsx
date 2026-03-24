import { useState, useEffect } from "react";
import api from "../api/client";

interface Comment {
  id: string;
  content: string;
  user_name: string;
  created_at: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  user_name: string;
  created_at: string;
  comment_count: number;
}

export default function CommunityPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    api
      .get("/posts")
      .then((res) => setPosts(res.data))
      .catch(() => {});
  }, []);

  async function handleCreatePost() {
    if (!title.trim() || !content.trim()) return;
    try {
      const res = await api.post("/posts", { title, content });
      setPosts((prev) => [res.data, ...prev]);
      setTitle("");
      setContent("");
      setShowForm(false);
    } catch {
      /* silently fail for demo */
    }
  }

  function updateCommentCount(postId: string, delta: number) {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, comment_count: p.comment_count + delta } : p
      )
    );
  }

  return (
    <div className="page community-page">
      <header className="page-header">
        <div className="page-header-row">
          <div>
            <h2>Community</h2>
            <p>Share and support each other</p>
          </div>
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "+ New Post"}
          </button>
        </div>
      </header>

      {showForm && (
        <div className="post-form">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your thoughts..."
            rows={4}
          />
          <button
            className="btn-primary"
            onClick={handleCreatePost}
            disabled={!title.trim() || !content.trim()}
          >
            Post
          </button>
        </div>
      )}

      <div className="posts-list">
        {posts.length === 0 && (
          <p style={{ color: "var(--text-muted)" }}>
            No posts yet. Be the first to share!
          </p>
        )}
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onCommentAdded={() => updateCommentCount(post.id, 1)}
          />
        ))}
      </div>
    </div>
  );
}

function PostCard({
  post,
  onCommentAdded,
}: {
  post: Post;
  onCommentAdded: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function toggleComments() {
    const next = !expanded;
    setExpanded(next);
    if (next && !loadedOnce) {
      try {
        const res = await api.get(`/posts/${post.id}/comments`);
        setComments(res.data);
        setLoadedOnce(true);
      } catch {
        /* ignore */
      }
    }
  }

  async function handleAddComment() {
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/posts/${post.id}/comments`, {
        content: newComment,
      });
      setComments((prev) => [...prev, res.data]);
      setNewComment("");
      onCommentAdded();
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <article className="post-card">
      <h3>{post.title}</h3>
      <p>{post.content}</p>
      <div className="post-meta">
        <span>{post.user_name}</span>
        <span>·</span>
        <span>{new Date(post.created_at).toLocaleDateString()}</span>
        <span>·</span>
        <button className="btn-comments-toggle" onClick={toggleComments}>
          {post.comment_count} comment{post.comment_count !== 1 ? "s" : ""}
          <span className="toggle-arrow">{expanded ? "▲" : "▼"}</span>
        </button>
      </div>

      {expanded && (
        <div className="comments-section">
          {comments.length === 0 && (
            <p className="no-comments">No comments yet. Start the conversation!</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="comment">
              <span className="comment-author">{c.user_name}</span>
              <span className="comment-body">{c.content}</span>
            </div>
          ))}
          <div className="comment-form">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddComment();
              }}
            />
            <button
              className="btn-primary btn-sm"
              disabled={!newComment.trim() || submitting}
              onClick={handleAddComment}
            >
              Reply
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
