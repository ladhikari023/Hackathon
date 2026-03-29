from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import func, select

from auth import get_current_user
from database import get_session
from models.comment import Comment
from models.post import Post
from models.user import User

router = APIRouter(prefix="/posts", tags=["posts"])
ANONYMOUS_LABEL = "Anonymous"


class PostRequest(BaseModel):
    title: str
    content: str


class CommentRequest(BaseModel):
    content: str


def _post_dict(post: Post, comment_count: int) -> dict:
    return {
        "id": str(post.id),
        "user_id": str(post.user_id),
        "title": post.title,
        "content": post.content,
        "user_name": ANONYMOUS_LABEL,
        "created_at": post.created_at.isoformat(),
        "comment_count": comment_count,
    }


@router.get("")
async def list_posts(session: AsyncSession = Depends(get_session)):
    comment_count = (
        select(func.count(Comment.id))
        .where(Comment.post_id == Post.id)
        .correlate(Post)
        .scalar_subquery()
    )
    stmt = (
        select(Post, comment_count)
        .order_by(Post.created_at.desc())
        .limit(50)
    )
    result = await session.exec(stmt)
    rows = result.all()
    return [_post_dict(post, count or 0) for post, count in rows]


@router.post("")
async def create_post(
    body: PostRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    post = Post(user_id=user.id, title=body.title, content=body.content)
    session.add(post)
    await session.commit()
    await session.refresh(post)
    return _post_dict(post, 0)


@router.get("/{post_id}/comments")
async def list_comments(post_id: str, session: AsyncSession = Depends(get_session)):
    stmt = (
        select(Comment)
        .where(Comment.post_id == post_id)
        .order_by(Comment.created_at)
    )
    result = await session.exec(stmt)
    comments = result.all()
    return [
        {
            "id": str(c.id),
            "content": c.content,
            "user_name": ANONYMOUS_LABEL,
            "created_at": c.created_at.isoformat(),
        }
        for c in comments
    ]


@router.post("/{post_id}/comments")
async def create_comment(
    post_id: str,
    body: CommentRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.exec(select(Post).where(Post.id == post_id))
    if not result.first():
        raise HTTPException(status_code=404, detail="Post not found")

    comment = Comment(post_id=post_id, user_id=user.id, content=body.content)
    session.add(comment)
    await session.commit()
    await session.refresh(comment)
    return {
        "id": str(comment.id),
        "content": comment.content,
        "user_name": ANONYMOUS_LABEL,
        "created_at": comment.created_at.isoformat(),
    }
