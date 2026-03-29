from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from models.chat import ChatMessage
from models.comment import Comment
from models.mood import MoodLog
from models.peer_match import PeerMatch
from models.peer_message import PeerMessage
from models.post import Post
from models.therapist import Therapist
from models.user import User

DEMO_ACCOUNTS: dict[str, dict] = {
    "ram":       {"name": "Ram Sharma", "email": "ram@mankosathi.app", "role": "user", "bio": "Feeling stretched between work stress and missing family, but trying to stay grounded one day at a time."},
    "ananya":    {"name": "Ananya Thapa", "email": "ananya@mankosathi.app", "role": "user", "bio": "Meditation, small routines, and honest conversations have been helping me lately."},
    "sita":      {"name": "Sita Gurung", "email": "sita@mankosathi.app", "role": "user", "bio": "Sleep has been difficult, but I am here to meet kind people who understand the hard days too."},
    "dr-sharma": {"name": "Dr. Sharma", "email": "dr.sharma@mankosathi.app", "role": "therapist", "bio": "Therapist focused on helping people feel heard, steady, and supported through anxiety and life transitions."},
    "dr-patel":  {"name": "Dr. Patel", "email": "dr.patel@mankosathi.app", "role": "therapist", "bio": "Interested in culturally aware care, stress management, and practical tools people can use every day."},
    "admin":     {"name": "Admin", "email": "admin@mankosathi.app", "role": "admin", "bio": "Helping keep the MankoSathi community safe, respectful, and available when people need support."},
}

THERAPISTS = [
    Therapist(name="Dr. Sharma", specialization="Anxiety & Depression", languages="English, Hindi, Nepali", bio="10+ years helping young adults navigate mental health challenges."),
    Therapist(name="Dr. Patel", specialization="Stress Management", languages="English, Gujarati", bio="Specializes in culturally sensitive therapy for South Asian communities."),
    Therapist(name="Dr. Thapa", specialization="Grief & Trauma", languages="English, Nepali", bio="Focused on helping individuals process difficult life transitions."),
]


async def seed_all(session: AsyncSession) -> None:
    result = await session.exec(select(User).where(User.provider == "demo").limit(1))
    if result.first():
        return

    users: dict[str, User] = {}
    for key, acct in DEMO_ACCOUNTS.items():
        user = User(
            name=acct["name"],
            email=acct["email"],
            role=acct["role"],
            bio=acct["bio"],
            provider="demo",
            provider_id=f"demo-{key}",
        )
        session.add(user)
        users[key] = user

    for t in THERAPISTS:
        session.add(Therapist(name=t.name, specialization=t.specialization, languages=t.languages, bio=t.bio))

    await session.flush()

    ram = users["ram"]
    ananya = users["ananya"]
    sita = users["sita"]

    # -- Community posts from different users --
    post1 = Post(user_id=ram.id, title="Feeling homesick", content="First winter abroad and I really miss home. Anyone else going through this?")
    post2 = Post(user_id=ananya.id, title="Meditation helped me today", content="Started with 5 minutes of breathing exercises. Small steps matter!")
    post3 = Post(user_id=sita.id, title="Struggling with sleep", content="Haven't been able to sleep well for the past week. Any tips?")
    post4 = Post(user_id=ram.id, title="Grateful for this community", content="Just wanted to say thank you to everyone here. It helps knowing I'm not alone.")
    post5 = Post(user_id=ananya.id, title="Therapy changed my life", content="Was hesitant at first but talking to a professional made such a difference. Don't be afraid to reach out.")
    for p in [post1, post2, post3, post4, post5]:
        session.add(p)

    await session.flush()

    # -- Comments: users replying to each other --
    comments = [
        Comment(post_id=post1.id, user_id=ananya.id, content="I felt the same during my first year. It does get better, hang in there!"),
        Comment(post_id=post1.id, user_id=sita.id, content="Video calling family every weekend helped me a lot."),
        Comment(post_id=post1.id, user_id=ram.id, content="Thanks everyone, really appreciate the support."),
        Comment(post_id=post2.id, user_id=ram.id, content="I've been wanting to try meditation. Any app recommendations?"),
        Comment(post_id=post2.id, user_id=sita.id, content="Even 2 minutes makes a difference. Consistency is key!"),
        Comment(post_id=post3.id, user_id=ananya.id, content="Try limiting screen time before bed. It helped me."),
        Comment(post_id=post3.id, user_id=ram.id, content="Warm milk and no caffeine after 3pm worked for me."),
        Comment(post_id=post4.id, user_id=sita.id, content="We're all in this together!"),
        Comment(post_id=post5.id, user_id=ram.id, content="Totally agree. Best decision I ever made."),
        Comment(post_id=post5.id, user_id=sita.id, content="How did you find the right therapist?"),
    ]
    for c in comments:
        session.add(c)

    # -- Mood logs from all users --
    mood_data = [
        (ram,   [("stressed", "work deadline coming up"), ("neutral", "regular day"), ("happy", "talked to family"), ("sad", "missing home"), ("anxious", "presentation tomorrow")]),
        (ananya, [("happy", "meditation session went well"), ("neutral", "quiet day"), ("stressed", "exam prep"), ("happy", "got good feedback at work")]),
        (sita,  [("sad", "couldn't sleep again"), ("anxious", "worried about grades"), ("happy", "made a new friend"), ("neutral", "just a regular day")]),
    ]
    for user, moods in mood_data:
        for mood, note in moods:
            session.add(MoodLog(user_id=user.id, mood=mood, note=note))

    # -- Chat history for Ram --
    chat = [
        ChatMessage(user_id=ram.id, role="user", message="I've been feeling really stressed lately"),
        ChatMessage(user_id=ram.id, role="ai", message="I hear you. Stress can feel overwhelming. What's been weighing on you the most?"),
        ChatMessage(user_id=ram.id, role="user", message="Work deadlines and being away from family"),
        ChatMessage(user_id=ram.id, role="ai", message="That's a tough combination. Being far from your support system while under pressure is really hard. Have you been able to talk to your family recently?"),
    ]
    for c in chat:
        session.add(c)

    # -- Peer match: Ram & Sita are buddies --
    buddy_match = PeerMatch(
        user1_id=ram.id,
        user2_id=sita.id,
        status="buddy",
        user1_buddy_opt=True,
        user2_buddy_opt=True,
    )
    session.add(buddy_match)
    await session.flush()

    peer_msgs = [
        PeerMessage(match_id=buddy_match.id, sender_id=ram.id, message="Hey, how are you doing today?"),
        PeerMessage(match_id=buddy_match.id, sender_id=sita.id, message="Had a rough morning but feeling a bit better now. You?"),
        PeerMessage(match_id=buddy_match.id, sender_id=ram.id, message="Same here. Work stress is getting to me. Glad we can talk though."),
        PeerMessage(match_id=buddy_match.id, sender_id=sita.id, message="Definitely. It helps knowing someone understands. We got this!"),
    ]
    for pm in peer_msgs:
        session.add(pm)

    await session.commit()
