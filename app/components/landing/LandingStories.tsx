"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { LANDING_STORIES, type LandingStory } from "@/lib/landing-stories";
import {
  storyMembershipLabel,
  wrapStoryRailPosition,
} from "@/lib/landing-story-rail";
import s from "./LandingStories.module.css";

// Fictional design examples only, matching the explicitly labeled approved mock.
const DEMO_STORIES: readonly LandingStory[] = [
  {
    id: "demo-maya",
    title: "It finally clicked.",
    quote: "Seeing my numbers together made the next step feel manageable.",
    name: "Maya R.",
    context: "Finding a starting point",
    joinedAt: "2026-07-01",
  },
  {
    id: "demo-alex",
    title: "Room for real life.",
    quote:
      "I wanted to save without feeling like every small purchase was a mistake.",
    name: "Alex P.",
    context: "Building a saving habit",
    joinedAt: "2026-05-01",
  },
  {
    id: "demo-sam",
    title: "A future I can picture.",
    quote: "A freedom date made the long-term goal feel easier to understand.",
    name: "Sam T.",
    context: "Thinking beyond payday",
    joinedAt: "2026-09-01",
  },
  {
    id: "demo-leah",
    title: "One step at a time.",
    quote: "Having a simple plan helped me feel more in control.",
    name: "Leah K.",
    context: "Making a first plan",
    joinedAt: "2026-01-01",
  },
];

function Portrait({
  story,
  demoIndex,
}: {
  story: LandingStory;
  demoIndex?: number;
}) {
  const [failed, setFailed] = useState(false);
  if (demoIndex !== undefined)
    return (
      <span
        aria-hidden="true"
        className={[s.portrait, s.demoPortrait].join(" ")}
        style={{ backgroundPosition: (demoIndex * 100) / 3 + "% center" }}
      />
    );
  return (
    <span className={s.portrait} aria-hidden="true">
      {story.avatar && !failed ? (
        // Approved portraits may be external; no additional image-host configuration is required.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={story.avatar}
          alt=""
          width={56}
          height={56}
          loading="lazy"
          draggable={false}
          onError={() => setFailed(true)}
        />
      ) : (
        story.name
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0])
          .join("")
      )}
    </span>
  );
}

/** Approved reviews only. An explicit localhost flag reveals clearly labeled fictional examples. */
export default function LandingStories() {
  const [preview, setPreview] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [visible, setVisible] = useState(true);
  const [inView, setInView] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [canLoop, setCanLoop] = useState(false);
  const [asOf, setAsOf] = useState<Date | null>(null);
  const rootRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const metrics = useRef({ width: 0, step: 0, ready: false });
  const dragX = useRef<number | null>(null);
  const railPosition = useRef<number | null>(null);
  const tween = useRef<number | null>(null);
  const interaction = useRef<{
    x: number;
    y: number;
    paused: boolean;
    dragged: boolean;
  } | null>(null);
  const titleId = useId();
  const viewportId = useId();
  const instructionsId = useId();

  useEffect(() => {
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(
      window.location.hostname,
    );
    setPreview(
      local &&
        new URLSearchParams(window.location.search).get("preview-stories") ===
          "1",
    );
    setAsOf(new Date());
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onPreference = () => {
      setReducedMotion(preference.matches);
      if (preference.matches) setPaused(true);
    };
    const onVisibility = () => setVisible(!document.hidden);
    onPreference();
    onVisibility();
    preference.addEventListener("change", onPreference);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      preference.removeEventListener("change", onPreference);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const isDemo = preview && LANDING_STORIES.length === 0;
  const stories = isDemo ? DEMO_STORIES : LANDING_STORIES;
  const rotating =
    canLoop &&
    !paused &&
    !hovered &&
    !dragging &&
    visible &&
    inView &&
    !reducedMotion;

  const advance = useCallback((delta: number) => {
    const viewport = viewportRef.current;
    const m = metrics.current;
    if (!viewport || !m.ready) return;
    const next = wrapStoryRailPosition(
      (railPosition.current ?? viewport.scrollLeft) + delta,
      m.width,
    );
    railPosition.current = next;
    viewport.scrollLeft = next;
  }, []);

  const stopTween = useCallback(() => {
    if (tween.current !== null) {
      window.cancelAnimationFrame(tween.current);
      tween.current = null;
    }
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    const group = groupRef.current;
    if (!viewport || !group) return;
    const measure = () => {
      const old = metrics.current;
      const width = group.getBoundingClientRect().width;
      const first = group.firstElementChild?.getBoundingClientRect().width ?? 0;
      const step =
        first + (parseFloat(window.getComputedStyle(group).columnGap) || 0);
      const loopable = stories.length > 1 && width > viewport.clientWidth + 1;
      const ready = loopable && viewport.scrollWidth >= width * 3 - 2;
      const offset = old.ready
        ? wrapStoryRailPosition(viewport.scrollLeft, old.width) - old.width
        : 0;
      metrics.current = { width, step, ready };
      setCanLoop(loopable);
      if (ready) {
        railPosition.current = wrapStoryRailPosition(width + offset, width);
        viewport.scrollLeft = railPosition.current;
      } else if (!loopable) {
        railPosition.current = 0;
        viewport.scrollLeft = 0;
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(group);
    return () => observer.disconnect();
  }, [stories.length, canLoop]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => setInView(entries[0]?.isIntersecting ?? false),
      { threshold: 0.1 },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, [stories.length]);

  useEffect(() => {
    if (!isDemo || window.location.hash !== "#stories") return;
    const frame = window.requestAnimationFrame(() =>
      rootRef.current?.scrollIntoView({ block: "center" }),
    );
    return () => window.cancelAnimationFrame(frame);
  }, [isDemo]);

  useEffect(() => {
    if (!rotating) return;
    let frame = 0;
    let previous: number | undefined;
    const tick = (now: number) => {
      if (previous !== undefined) advance(Math.min(now - previous, 50) * 0.026);
      previous = now;
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [rotating, advance]);

  useEffect(() => () => stopTween(), [stopTween]);

  function move(direction: number) {
    setPaused(true);
    stopTween();
    const distance = metrics.current.step * direction;
    if (reducedMotion) {
      advance(distance);
      return;
    }
    let started: number | undefined;
    let previous = 0;
    const tick = (now: number) => {
      if (started === undefined) started = now;
      const progress = Math.min((now - started) / 320, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      advance((eased - previous) * distance);
      previous = eased;
      if (progress < 1) tween.current = window.requestAnimationFrame(tick);
      else tween.current = null;
    };
    tween.current = window.requestAnimationFrame(tick);
  }

  function pointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    interaction.current = {
      x: event.clientX,
      y: event.clientY,
      paused,
      dragged: false,
    };
    setPaused(true);
    stopTween();
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    dragX.current = event.clientX;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const current = interaction.current;
    if (
      current &&
      (Math.abs(current.x - event.clientX) > 6 ||
        Math.abs(current.y - event.clientY) > 6)
    )
      current.dragged = true;
    if (dragX.current === null) return;
    advance(dragX.current - event.clientX);
    dragX.current = event.clientX;
  }
  function pointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    dragX.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function onScroll() {
    const viewport = viewportRef.current;
    const m = metrics.current;
    if (!viewport || !m.ready) return;
    if (viewport.scrollLeft < m.width || viewport.scrollLeft >= m.width * 2)
      viewport.scrollLeft = wrapStoryRailPosition(viewport.scrollLeft, m.width);
    if (!rotating && tween.current === null && dragX.current === null)
      railPosition.current = viewport.scrollLeft;
  }

  if (!stories.length) return null;
  const copies = canLoop ? [0, 1, 2] : [0];
  return (
    <section
      ref={rootRef}
      id="stories"
      className={s.root}
      aria-roledescription="carousel"
      aria-labelledby={titleId}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
      onFocusCapture={() => setPaused(true)}
    >
      {isDemo && (
        <p className={s.previewNotice}>
          Design preview — fictional people, sample quotes and example join
          dates. Not customer reviews.
        </p>
      )}
      <div className={s.heading}>
        <div>
          <span className={s.eyebrow}>People &amp; their plans</span>
          <h2 id={titleId}>
            A clearer picture.
            <br />A little more possibility.
          </h2>
          <p>Different starting points. One step forward.</p>
        </div>
      </div>
      <div
        ref={viewportRef}
        id={viewportId}
        className={s.viewport}
        data-dragging={dragging || undefined}
        tabIndex={canLoop ? 0 : undefined}
        role="group"
        aria-label="Reviews"
        aria-describedby={instructionsId}
        onClick={() => {
          const current = interaction.current;
          if (current && !current.dragged) setPaused(!current.paused);
          interaction.current = null;
        }}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerEnd}
        onPointerCancel={pointerEnd}
        onLostPointerCapture={() => {
          dragX.current = null;
          setDragging(false);
        }}
        onScroll={onScroll}
        onKeyDown={(event) => {
          if (
            event.target === event.currentTarget &&
            (event.key === "ArrowLeft" ||
              event.key === "ArrowRight" ||
              event.key === " ")
          ) {
            event.preventDefault();
            if (event.key === " ") {
              stopTween();
              setPaused((current) => !current);
            } else move(event.key === "ArrowLeft" ? -1 : 1);
          }
        }}
      >
        <div className={s.track}>
          {copies.map((copy) => (
            <div
              key={copy}
              ref={copy === 0 ? groupRef : undefined}
              className={s.group}
              aria-hidden={copy !== 0 || undefined}
              data-copy={copy}
            >
              {stories.map((story, index) => (
                <article
                  key={story.id}
                  className={[s.card, s["tone" + (index % 4)]].join(" ")}
                  aria-label={story.name}
                >
                  {story.title && <h3>{story.title}</h3>}
                  <blockquote>{story.quote}</blockquote>
                  <div className={s.person}>
                    <Portrait
                      story={story}
                      demoIndex={isDemo ? index : undefined}
                    />
                    <div>
                      <strong>{story.name}</strong>
                      <span>
                        {(asOf && storyMembershipLabel(story.joinedAt, asOf)) ||
                          story.context}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ))}
        </div>
      </div>
      <p id={instructionsId} className={s.srOnly}>
        Tap or click a card to pause or resume. With keyboard focus, press Space
        to pause or resume, and the left or right arrow key to browse.
      </p>
    </section>
  );
}
