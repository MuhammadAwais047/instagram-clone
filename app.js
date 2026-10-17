/* Fotogram — vanilla-JS Instagram-style feed
   All data lives in localStorage; photos come from picsum.photos (no key). */
(() => {
  "use strict";

  /* ---------- tiny helpers ---------- */
  const $ = (sel) => document.querySelector(sel);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const rndInt = (max) => Math.floor(Math.random() * max);
  const pick = (arr) => arr[rndInt(arr.length)];

  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* private mode — app still works for the session */
      }
    },
  };

  const PLACEHOLDER =
    "data:image/svg+xml," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="#1c1c24"/><text x="300" y="310" font-family="sans-serif" font-size="28" fill="#6b6b7a" text-anchor="middle">photo unavailable</text></svg>'
    );
  const onImgError = (img) => {
    img.onerror = null;
    img.src = PLACEHOLDER;
  };

  const timeAgo = (ts) => {
    const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d`;
    return `${Math.floor(d / 7)}w`;
  };

  /* ---------- seed data ---------- */
  const USERS = ["mira", "leo", "sana", "kofi", "ines", "ravi", "zoe", "tomas"];

  const CAPTIONS = [
    "golden hour never misses",
    "found this little alley downtown",
    "coffee number three today ☕",
    "the mountains said hello today",
    "weekend reset",
    "new lens, who dis",
    "sunday market haul",
    "clouds doing that thing again",
    "last swim of the season",
    "this cat adopted me",
    "city lights from the rooftop",
    "breakfast for dinner, obviously",
  ];
  const COMMENT_POOL = [
    "this is stunning 😍",
    "okay wow",
    "saving this for wallpaper",
    "where is this??",
    "the colors though",
    "teach me your ways",
    "framing this",
    "you always find the good light",
    "obsessed",
    "recipe please",
  ];

  const photo = (seed, w = 600, h = 600) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

  const freshPosts = () => {
    const posts = [];
    for (let i = 0; i < 12; i++) {
      const user = USERS[i % USERS.length];
      const created = Date.now() - (i + 1) * (45 + rndInt(400)) * 60000;
      const comments = [];
      const nComments = rndInt(3);
      for (let c = 0; c <= nComments; c++) {
        comments.push({
          user: pick(USERS.filter((u) => u !== user)),
          text: pick(COMMENT_POOL),
          ts: created + 60000 * (10 + rndInt(200)),
        });
      }
      posts.push({
        id: `p${i + 1}`,
        user,
        seed: `fg${i + 1}`,
        caption: CAPTIONS[i % CAPTIONS.length],
        likes: 12 + rndInt(480),
        comments,
        created,
      });
    }
    return posts;
  };

  const freshActivity = () => [
    { type: "follow", user: pick(USERS), ts: Date.now() - 3 * 3600000, seen: false },
    { type: "like", user: pick(USERS), text: "your profile", ts: Date.now() - 26 * 3600000, seen: true },
  ];

  /* ---------- state ---------- */
  const KEY_POSTS = "fotogram-posts-v1";
  const KEY_LIKED = "fotogram-liked-v1";
  const KEY_SAVED = "fotogram-saved-v1";
  const KEY_ACTIVITY = "fotogram-activity-v1";
  const KEY_SEEN = "fotogram-stories-seen-v1";
  const KEY_FOLLOWS = "fotogram-follows-v1";

  let posts = store.get(KEY_POSTS, null);
  if (!Array.isArray(posts) || posts.length === 0) {
    posts = freshPosts();
    store.set(KEY_POSTS, posts);
  }
  const liked = new Set(store.get(KEY_LIKED, []));
  const saved = new Set(store.get(KEY_SAVED, []));
  const followed = new Set(store.get(KEY_FOLLOWS, []));
  let activity = store.get(KEY_ACTIVITY, null);
  if (!Array.isArray(activity)) {
    activity = freshActivity();
    store.set(KEY_ACTIVITY, activity);
  }
  const storiesSeen = new Set(store.get(KEY_SEEN, []));

  const likeCount = (p) => p.likes + (liked.has(p.id) ? 1 : 0);

  const persistPosts = () => store.set(KEY_POSTS, posts);

  /* ---------- toast ---------- */
  let toastTimer;
  const toast = (msg) => {
    const t = $("#toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      t.hidden = true;
    }, 2200);
  };

  /* ---------- view switching ---------- */
  const views = {
    feed: $("#feed-view"),
    explore: $("#explore-view"),
    profile: $("#profile-view"),
  };
  const navButtons = {
    feed: $("#nav-feed"),
    explore: $("#nav-explore"),
    activity: $("#nav-activity"),
    profile: $("#nav-profile"),
  };

  const show = (name) => {
    for (const [key, view] of Object.entries(views)) {
      view.hidden = key !== name;
    }
    for (const [key, btn] of Object.entries(navButtons)) {
      const active = key === name;
      btn.classList.toggle("is-active", active);
      if (btn.hasAttribute("aria-pressed")) btn.setAttribute("aria-pressed", String(active));
    }
    if (name !== "feed") window.scrollTo({ top: 0 });
  };

  navButtons.feed.addEventListener("click", () => show("feed"));
  navButtons.explore.addEventListener("click", () => {
    renderExplore();
    show("explore");
  });
  navButtons.profile.addEventListener("click", () => {
    renderProfile();
    show("profile");
  });
  $("#logo-link").addEventListener("click", (e) => {
    e.preventDefault();
    show("feed");
  });

  /* ---------- activity ---------- */
  const activityPanel = $("#activity-panel");
  const activityList = $("#activity-list");
  const activityDot = $("#activity-dot");

  const unseenCount = () => activity.filter((a) => !a.seen).length;

  const renderActivity = () => {
    activityList.textContent = "";
    if (activity.length === 0) {
      activityList.append(el("p", "act-empty", "Nothing yet — post something!"));
      return;
    }
    for (const item of activity.slice(0, 30)) {
      const row = el("div", "act-row" + (item.seen ? "" : " unread"));
      row.append(el("span", "avatar sm", item.user[0].toUpperCase()));
      const text = el("p", "a-text");
      text.append(el("b", null, item.user));
      if (item.type === "follow") {
        text.append(" started following you");
      } else if (item.type === "like") {
        text.append(` liked ${item.postId === "you" ? "your post" : item.text || "a post"}`);
      } else if (item.type === "comment") {
        text.append(item.postId === "you" ? " commented on your post: " : " commented: ");
        text.append(el("i", null, `“${item.text}”`));
      } else {
        text.append(" mentioned you: ");
        text.append(el("i", null, `“${item.text}”`));
      }
      row.append(text);
      row.append(el("span", "a-time", timeAgo(item.ts)));
      activityList.append(row);
    }
  };

  const syncActivityDot = () => {
    activityDot.hidden = unseenCount() === 0;
  };

  const addActivity = (item) => {
    activity.unshift({ ts: Date.now(), seen: false, ...item });
    activity = activity.slice(0, 40);
    store.set(KEY_ACTIVITY, activity);
    syncActivityDot();
    if (!activityPanel.hidden) renderActivity();
  };

  navButtons.activity.addEventListener("click", (e) => {
    e.stopPropagation();
    const willOpen = activityPanel.hidden;
    activityPanel.hidden = !willOpen;
    if (willOpen) {
      renderActivity();
      activity = activity.map((a) => ({ ...a, seen: true }));
      store.set(KEY_ACTIVITY, activity);
      syncActivityDot();
    }
  });
  document.addEventListener("click", (e) => {
    if (!activityPanel.hidden && !activityPanel.contains(e.target)) {
      activityPanel.hidden = true;
    }
  });

  /* ---------- stories ---------- */
  const STORY_MS = 5000;
  const viewer = $("#story-viewer");
  const storyImg = $("#story-img");
  const storyUser = $("#story-user");
  const storyBars = $("#story-bars");
  let storyTimer;
  let storyIndex = -1;

  const renderStoriesBar = () => {
    const bar = $(".stories");
    bar.textContent = "";
    USERS.forEach((name) => {
      const item = el("button", "story-btn" + (storiesSeen.has(name) ? " seen" : ""));
      item.type = "button";
      item.setAttribute("role", "listitem");
      item.setAttribute("aria-label", `${name}'s story`);
      const ring = el("span", "story-ring");
      ring.append(el("span", "inner", name[0].toUpperCase()));
      item.append(ring, el("span", "s-name", name));
      item.addEventListener("click", () => openStory(USERS.indexOf(name)));
      bar.append(item);
    });
  };

  const renderStoryBars = (activeIdx) => {
    storyBars.textContent = "";
    USERS.forEach((_name, i) => {
      storyBars.append(el("i", i < activeIdx ? "done" : i === activeIdx ? "active" : ""));
    });
  };

  const openStory = (idx) => {
    if (idx < 0 || idx >= USERS.length) {
      closeStory();
      return;
    }
    storyIndex = idx;
    const name = USERS[idx];
    storyImg.src = photo(`${name}story`, 720, 1280);
    storyImg.alt = `${name}'s story`;
    storyUser.textContent = name;
    renderStoryBars(idx);
    viewer.hidden = false;
    document.body.classList.add("no-scroll");
    clearTimeout(storyTimer);
    storyTimer = setTimeout(() => openStory(idx + 1), STORY_MS);
    if (!storiesSeen.has(name)) {
      storiesSeen.add(name);
      store.set(KEY_SEEN, [...storiesSeen]);
      renderStoriesBar();
    }
  };

  const closeStory = () => {
    clearTimeout(storyTimer);
    viewer.hidden = true;
    document.body.classList.remove("no-scroll");
    storyIndex = -1;
  };

  $("#story-close").addEventListener("click", closeStory);
  viewer.addEventListener("click", (e) => {
    if (e.target === viewer) closeStory();
  });
  $("#story-prev").addEventListener("click", () => openStory(Math.max(0, storyIndex - 1)));
  $("#story-next").addEventListener("click", () => openStory(storyIndex + 1));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !viewer.hidden) closeStory();
    if (viewer.hidden) return;
    if (e.key === "ArrowRight") openStory(storyIndex + 1);
    if (e.key === "ArrowLeft") openStory(Math.max(0, storyIndex - 1));
  });

  /* ---------- post card ---------- */
  const commentRow = (c) => {
    const row = el("p", "c-row");
    row.append(el("b", null, c.user), ` ${c.text}`, el("span", "c-time", ` · ${timeAgo(c.ts)}`));
    return row;
  };

  const heartSvg =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20.5C7 16.5 3.5 13.3 3.5 9.6 3.5 7 5.5 5 8 5c1.6 0 3.1.9 4 2.2C12.9 5.9 14.4 5 16 5c2.5 0 4.5 2 4.5 4.6 0 3.7-3.5 6.9-8.5 10.9z"/></svg>';
  const commentSvg =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-8 8H4l2.3-2.9A8 8 0 1 1 21 12z"/></svg>';
  const shareSvg =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 3 10.5 13.5"/><path d="M21 3l-6.8 18-3.7-7.5L3 9.8z"/></svg>';
  const saveSvg =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12v18l-6-4.5L6 21z"/></svg>';

  const buildPostCard = (p) => {
    const card = el("article", "post");
    card.id = `post-${p.id}`;

    /* header */
    const head = el("div", "post-head");
    head.append(el("span", "avatar", p.user[0].toUpperCase()));
    head.append(el("b", "p-user", p.user));
    head.append(el("span", "p-time", timeAgo(p.created)));
    head.append(el("span", "p-more", "···"));
    card.append(head);

    /* image (double-click to like) */
    const imgWrap = el("div", "post-img-wrap");
    const img = el("img", "post-img");
    img.src = photo(p.seed);
    img.alt = p.caption ? `Photo by ${p.user}: ${p.caption}` : `Photo by ${p.user}`;
    img.loading = "lazy";
    img.onerror = () => onImgError(img);
    imgWrap.append(img);
    const burst = el("span", "heart-burst", "♥");
    burst.setAttribute("aria-hidden", "true");
    imgWrap.append(burst);
    img.addEventListener("dblclick", () => {
      if (!liked.has(p.id)) toggleLike(p, card);
      burst.classList.remove("pop");
      void burst.offsetWidth;
      burst.classList.add("pop");
    });
    card.append(imgWrap);

    /* actions */
    const actions = el("div", "post-actions");

    const likeBtn = el("button", "p-btn like" + (liked.has(p.id) ? " liked" : ""));
    likeBtn.type = "button";
    likeBtn.setAttribute("aria-label", "Like");
    likeBtn.setAttribute("aria-pressed", String(liked.has(p.id)));
    likeBtn.innerHTML = heartSvg;
    likeBtn.addEventListener("click", () => toggleLike(p, card));
    actions.append(likeBtn);

    const commentBtn = el("button", "p-btn");
    commentBtn.type = "button";
    commentBtn.setAttribute("aria-label", "Comment");
    commentBtn.innerHTML = commentSvg;
    commentBtn.addEventListener("click", () => {
      card.querySelector(".p-add input").focus();
    });
    actions.append(commentBtn);

    const shareBtn = el("button", "p-btn");
    shareBtn.type = "button";
    shareBtn.setAttribute("aria-label", "Share");
    shareBtn.innerHTML = shareSvg;
    shareBtn.addEventListener("click", async () => {
      const text = p.caption ? `${p.user}: “${p.caption}”` : `Photo by ${p.user} on Fotogram`;
      try {
        if (navigator.share) {
          await navigator.share({ title: "Fotogram", text });
        } else {
          await navigator.clipboard.writeText(text);
          toast("Copied to clipboard");
        }
      } catch {
        /* user dismissed the share sheet */
      }
    });
    actions.append(shareBtn);

    const saveBtn = el("button", "p-btn save" + (saved.has(p.id) ? " saved" : ""));
    saveBtn.type = "button";
    saveBtn.setAttribute("aria-label", "Save");
    saveBtn.setAttribute("aria-pressed", String(saved.has(p.id)));
    saveBtn.innerHTML = saveSvg;
    saveBtn.addEventListener("click", () => {
      if (saved.has(p.id)) {
        saved.delete(p.id);
        toast("Removed from saved");
      } else {
        saved.add(p.id);
        toast("Saved");
      }
      store.set(KEY_SAVED, [...saved]);
      saveBtn.classList.toggle("saved", saved.has(p.id));
      saveBtn.setAttribute("aria-pressed", String(saved.has(p.id)));
    });
    actions.append(saveBtn);
    card.append(actions);

    /* likes line */
    card.append(el("p", "p-likes", `${likeCount(p).toLocaleString("en-US")} likes`));

    /* caption + comments */
    if (p.caption) {
      const cap = el("p", "p-caption");
      cap.append(el("b", null, p.user), ` ${p.caption}`);
      card.append(cap);
    }

    const comments = [...p.comments].sort((a, b) => a.ts - b.ts);
    const commentsBox = el("div", "p-comments");
    if (comments.length > 2) {
      const more = el("button", "c-view");
      more.type = "button";
      more.textContent = `View all ${comments.length} comments`;
      more.addEventListener("click", () => {
        commentsBox.textContent = "";
        comments.forEach((c) => commentsBox.append(commentRow(c)));
      });
      commentsBox.append(more);
    }
    comments.slice(-2).forEach((c) => commentsBox.append(commentRow(c)));
    card.append(commentsBox);

    /* add-comment form */
    const form = el("form", "p-add");
    const input = el("input");
    input.type = "text";
    input.placeholder = "Add a comment…";
    input.maxLength = 500;
    input.setAttribute("aria-label", `Comment on ${p.user}'s post`);
    form.append(input);
    const postBtn = el("button");
    postBtn.type = "submit";
    postBtn.textContent = "Post";
    form.append(postBtn);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      const c = { user: "you", text, ts: Date.now() };
      p.comments.push(c);
      persistPosts();
      commentsBox.append(commentRow(c));
      input.value = "";
      addActivity({ type: "comment", user: "you", text, postId: p.id });
    });
    card.append(form);

    return card;
  };

  const renderFeed = () => {
    const feed = $("#feed");
    feed.textContent = "";
    const frag = document.createDocumentFragment();
    for (const p of posts) frag.append(buildPostCard(p));
    feed.append(frag);
    $("#feed-end").hidden = false;
  };

  const toggleLike = (p, card) => {
    const nowLiked = !liked.has(p.id);
    if (nowLiked) liked.add(p.id);
    else liked.delete(p.id);
    store.set(KEY_LIKED, [...liked]);
    const likeBtn = card.querySelector(".p-btn.like");
    likeBtn.classList.toggle("liked", nowLiked);
    likeBtn.setAttribute("aria-pressed", String(nowLiked));
    card.querySelector(".p-likes").textContent = `${likeCount(p).toLocaleString("en-US")} likes`;
    if (nowLiked && p.user !== "you") {
      addActivity({ type: "like", user: "you", postId: p.id, text: `${p.user}'s post` });
    }
  };

  const flashPost = (id) => {
    const card = document.getElementById(`post-${id}`);
    if (!card) return;
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.classList.add("flash");
    setTimeout(() => card.classList.remove("flash"), 1800);
  };

  /* ---------- composer ---------- */
  const composer = $("#composer");
  const composeMsg = $("#compose-msg");
  composer.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("#compose-text");
    const caption = input.value.trim();
    if (!caption) {
      composeMsg.textContent = "Write something first ✍️";
      composeMsg.hidden = false;
      setTimeout(() => {
        composeMsg.hidden = true;
      }, 2500);
      return;
    }
    shareNewPost(caption, `fgu${Date.now() % 100000}`);
    input.value = "";
  });

  const shareNewPost = (caption, seed) => {
    const p = {
      id: `u${Date.now()}`,
      user: "you",
      seed,
      caption,
      likes: 0,
      comments: [],
      created: Date.now(),
    };
    posts.unshift(p);
    persistPosts();
    $("#feed").prepend(buildPostCard(p));
    toast("Posted ✨");
    scheduleFan(p);
    return p;
  };

  /* demo fans react to your new post while the tab is open */
  const scheduleFan = (p) => {
    const fan = pick(USERS);
    setTimeout(() => {
      p.likes += 1;
      persistPosts();
      const card = document.getElementById(`post-${p.id}`);
      if (card) card.querySelector(".p-likes").textContent = `${likeCount(p).toLocaleString("en-US")} likes`;
      addActivity({ type: "like", user: fan, postId: "you" });
    }, 6000 + rndInt(4000));
    setTimeout(() => {
      const text = pick(COMMENT_POOL);
      p.comments.push({ user: fan, text, ts: Date.now() });
      persistPosts();
      const card = document.getElementById(`post-${p.id}`);
      if (card) card.querySelector(".p-comments").append(commentRow(p.comments[p.comments.length - 1]));
      addActivity({ type: "comment", user: fan, text, postId: "you" });
    }, 14000 + rndInt(6000));
  };

  /* ---------- create modal ---------- */
  const modal = $("#create-modal");
  const preview = $("#create-preview");
  const captionBox = $("#create-caption");
  let draftSeed = "";

  const newDraft = () => {
    draftSeed = `fgd${Date.now() % 1000000}`;
    preview.src = photo(draftSeed);
  };

  $("#nav-create").addEventListener("click", () => {
    newDraft();
    modal.hidden = false;
    document.body.classList.add("no-scroll");
    captionBox.focus();
  });
  $("#create-shuffle").addEventListener("click", newDraft);
  $("#create-close").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target.hasAttribute("data-close")) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeModal();
  });

  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove("no-scroll");
    captionBox.value = "";
  }

  $("#create-share").addEventListener("click", () => {
    const caption = captionBox.value.trim();
    closeModal();
    show("feed");
    shareNewPost(caption, draftSeed);
  });

  /* ---------- explore / profile grids ---------- */
  const gridTile = (p) => {
    const tile = el("button", "g-item");
    tile.type = "button";
    tile.setAttribute("aria-label", `Post by ${p.user}, ${likeCount(p)} likes, ${p.comments.length} comments`);
    const img = el("img");
    img.src = photo(p.seed, 400, 400);
    img.alt = "";
    img.loading = "lazy";
    img.onerror = () => onImgError(img);
    tile.append(img);
    const overlay = el("span", "g-likes");
    overlay.append(el("span", null, `♥ ${likeCount(p)}`), el("span", null, `💬 ${p.comments.length}`));
    tile.append(overlay);
    tile.addEventListener("click", () => {
      show("feed");
      requestAnimationFrame(() => flashPost(p.id));
    });
    return tile;
  };

  const renderExplore = () => {
    const grid = $("#explore-grid");
    grid.textContent = "";
    const frag = document.createDocumentFragment();
    for (const p of posts) frag.append(gridTile(p));
    grid.append(frag);
  };

  const renderProfile = () => {
    const mine = posts.filter((p) => p.user === "you");
    $("#stat-posts").textContent = String(mine.length);
    $("#stat-likes").textContent = liked.size.toLocaleString("en-US");
    let myComments = 0;
    for (const p of posts) {
      myComments += p.comments.filter((c) => c.user === "you").length;
    }
    $("#stat-comments").textContent = String(myComments);

    const grid = $("#profile-grid");
    grid.textContent = "";
    const frag = document.createDocumentFragment();
    for (const p of mine) frag.append(gridTile(p));
    grid.append(frag);
    $("#profile-empty").hidden = mine.length > 0;
  };

  /* ---------- suggestions ---------- */
  const renderSuggestions = () => {
    const wrap = $("#suggestions");
    wrap.textContent = "";
    for (const name of USERS.slice(0, 5)) {
      const row = el("div", "sug-row");
      row.append(el("span", "avatar", name[0].toUpperCase()));
      const who = el("div", "sug-who");
      who.append(el("b", "s-name", name), el("span", "s-why", "suggested for you"));
      row.append(who);
      const btn = el("button");
      btn.type = "button";
      const isFollowing = followed.has(name);
      btn.textContent = isFollowing ? "Following" : "Follow";
      if (isFollowing) btn.classList.add("is-following");
      btn.addEventListener("click", () => {
        if (followed.has(name)) {
          followed.delete(name);
          toast(`Unfollowed ${name}`);
        } else {
          followed.add(name);
          toast(`Following ${name}`);
          addActivity({ type: "follow", user: name });
        }
        store.set(KEY_FOLLOWS, [...followed]);
        renderSuggestions();
      });
      row.append(btn);
      wrap.append(row);
    }
  };

  /* ---------- boot ---------- */
  renderStoriesBar();
  renderSuggestions();
  renderFeed();
  renderActivity();
  syncActivityDot();
  show("feed");
})();
