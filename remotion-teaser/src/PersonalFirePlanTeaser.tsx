import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
} from 'remotion';

type SpendingInsight = {
  label: string;
  value: string;
  benchmark: string;
  tone: 'warning' | 'positive' | 'action';
};

export type PersonalFirePlanTeaserProps = {
  city: string;
  income: string;
  rentSpend: string;
  foodSpend: string;
  savingsRate: string;
  projectedFireDate: string;
  timelineImpact: string;
  monthlyInvestmentPlan: string;
  ctaText: string;
  insights: SpendingInsight[];
};

export const teaserData: PersonalFirePlanTeaserProps = {
  city: 'Austin',
  income: '$142K',
  rentSpend: '$3,050/mo',
  foodSpend: '$690/mo',
  savingsRate: '18%',
  projectedFireDate: '2042',
  timelineImpact: '4.2 years sooner',
  monthlyInvestmentPlan: '$300/mo',
  ctaText: 'Build your Financial Independence plan',
  insights: [
    {
      label: 'Rent is high for Austin',
      value: '42% of income',
      benchmark: 'City target: 28%',
      tone: 'warning',
    },
    {
      label: 'Food spend is efficient',
      value: '$690/mo',
      benchmark: 'Below Austin average',
      tone: 'positive',
    },
    {
      label: 'Savings rate can pull FIRE forward',
      value: '18% -> 25%',
      benchmark: 'Moves FIRE by 4.2 years',
      tone: 'action',
    },
  ],
};

const colors = {
  page: '#f7fbf6',
  surface: '#ffffff',
  ink: '#06281f',
  muted: '#547168',
  border: '#dce9df',
  green: '#0f8f5f',
  greenDark: '#063f31',
  greenSoft: '#e9f8ef',
  teal: '#2ecbb3',
  warning: '#bb6b00',
  warningBg: '#fff4de',
};

const ease = Easing.bezier(0.16, 1, 0.3, 1);

function enter(frame: number, start: number, duration = 18) {
  return interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });
}

function slideUp(frame: number, start: number, distance = 54) {
  const p = enter(frame, start);
  return {
    opacity: p,
    transform: `translateY(${(1 - p) * distance}px)`,
  };
}

function sceneOpacity(globalFrame: number, from: number, duration: number, fade = 18) {
  const end = from + duration;
  const fadeIn = from === 0 ? 1 : interpolate(globalFrame, [from, from + fade], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });
  const fadeOut = end >= 480 ? 1 : interpolate(globalFrame, [end - fade, end], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });

  return Math.min(fadeIn, fadeOut);
}

function MovingBackdrop({dark = false}: {dark?: boolean}) {
  const frame = useCurrentFrame();
  const sweep = interpolate(frame % 150, [0, 150], [-55, 135]);
  const drift = Math.sin(frame / 36) * 18;
  const glow = interpolate(Math.sin(frame / 28), [-1, 1], [0.18, 0.34]);

  return (
    <>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: dark
          ? `linear-gradient(135deg, ${colors.greenDark}, #07513f 48%, #0a3a30)`
          : `linear-gradient(135deg, ${colors.page}, #eef9f1 48%, #ffffff)`,
      }} />
      <div style={{
        position: 'absolute',
        inset: -120,
        opacity: dark ? 0.16 : 0.28,
        backgroundImage: dark
          ? 'linear-gradient(rgba(255,255,255,0.13) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.10) 2px, transparent 2px)'
          : 'linear-gradient(rgba(15,143,95,0.12) 2px, transparent 2px), linear-gradient(90deg, rgba(15,143,95,0.10) 2px, transparent 2px)',
        backgroundSize: '92px 92px',
        transform: `translate(${drift}px, ${-drift * 0.7}px) rotate(-1deg)`,
      }} />
      <div style={{
        position: 'absolute',
        top: -260,
        bottom: -260,
        left: `${sweep}%`,
        width: 280,
        transform: 'rotate(16deg)',
        opacity: glow,
        background: dark
          ? 'linear-gradient(90deg, transparent, rgba(46,203,179,0.55), transparent)'
          : 'linear-gradient(90deg, transparent, rgba(15,143,95,0.22), transparent)',
        filter: 'blur(18px)',
      }} />
    </>
  );
}

function CrossfadeScene({from, duration, children}: {from: number; duration: number; children: React.ReactNode}) {
  const globalFrame = useCurrentFrame();
  const opacity = sceneOpacity(globalFrame, from, duration);

  return (
    <Sequence from={from} durationInFrames={duration}>
      <AbsoluteFill style={{opacity}}>
        {children}
      </AbsoluteFill>
    </Sequence>
  );
}

function HeaderBadge({compact = false}: {compact?: boolean}) {
  const frame = useCurrentFrame();
  const breathe = interpolate(Math.sin(frame / 22), [-1, 1], [0.985, 1.015]);

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 12,
      padding: compact ? '12px 18px' : '14px 22px',
      borderRadius: 999,
      color: colors.greenDark,
      background: colors.greenSoft,
      border: `2px solid ${colors.border}`,
      fontSize: compact ? 24 : 28,
      fontWeight: 800,
      letterSpacing: 0,
      transform: `scale(${breathe})`,
    }}>
      <span style={{
        width: compact ? 14 : 18,
        height: compact ? 14 : 18,
        borderRadius: 999,
        background: colors.teal,
        boxShadow: `0 0 0 8px rgba(46, 203, 179, 0.14)`,
      }} />
      UntilFire
    </div>
  );
}

function SceneShell({children, dark = false}: {children: React.ReactNode; dark?: boolean}) {
  const frame = useCurrentFrame();
  const borderPulse = interpolate(Math.sin(frame / 30), [-1, 1], [0.72, 1]);

  return (
    <AbsoluteFill style={{
      color: dark ? '#f4fff8' : colors.ink,
      padding: 72,
      fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      overflow: 'hidden',
    }}>
      <MovingBackdrop dark={dark} />
      <div style={{
        position: 'absolute',
        inset: 28,
        borderRadius: 54,
        border: dark ? '2px solid rgba(255,255,255,0.14)' : `2px solid ${colors.border}`,
        opacity: borderPulse,
        pointerEvents: 'none',
      }} />
      {children}
    </AbsoluteFill>
  );
}

function HookScene() {
  const frame = useCurrentFrame();
  const pop = spring({
    frame,
    fps: 30,
    config: {damping: 14, stiffness: 140, mass: 0.8},
  });
  const headlineDrift = Math.sin(frame / 34) * 8;

  return (
    <SceneShell>
      <div style={{...slideUp(frame, 0), marginTop: 24}}>
        <HeaderBadge />
      </div>
      <div style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 36,
      }}>
        <h1 style={{
          margin: 0,
          fontSize: 108,
          lineHeight: 0.94,
          letterSpacing: 0,
          fontWeight: 900,
          maxWidth: 850,
          transform: `translateY(${headlineDrift}px) scale(${interpolate(pop, [0, 1], [0.94, 1])})`,
        }}>
          Retire early is not a dream.
          <span style={{display: 'block', color: colors.green}}>It is a plan.</span>
        </h1>
        <div style={{
          ...slideUp(frame, 18),
          fontSize: 36,
          lineHeight: 1.25,
          color: colors.muted,
          fontWeight: 650,
          maxWidth: 760,
        }}>
          FIRE = Financial Independence, Retire Early.
        </div>
      </div>
    </SceneShell>
  );
}

function BankScene(props: PersonalFirePlanTeaserProps) {
  const frame = useCurrentFrame();
  const check = enter(frame, 34, 12);
  const cardFloat = Math.sin(frame / 28) * 10;
  const rows = [
    ['Rent', props.rentSpend],
    ['Groceries + dining', props.foodSpend],
    ['Monthly income', props.income],
  ];

  return (
    <SceneShell>
      <div style={slideUp(frame, 0)}>
        <HeaderBadge compact />
      </div>
      <div style={{marginTop: 110}}>
        <div style={{...slideUp(frame, 4), fontSize: 34, color: colors.green, fontWeight: 850}}>
          Connect your bank
        </div>
        <h2 style={{...slideUp(frame, 8), margin: '18px 0 36px', fontSize: 82, lineHeight: 0.98, letterSpacing: 0}}>
          UntilFire learns your real spending.
        </h2>
        <div style={{
          ...slideUp(frame, 18),
          background: colors.surface,
          border: `2px solid ${colors.border}`,
          borderRadius: 36,
          padding: 34,
          boxShadow: '0 28px 80px rgba(6, 63, 49, 0.12)',
          transform: `${slideUp(frame, 18).transform} translateY(${cardFloat}px)`,
        }}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26}}>
            <div style={{fontSize: 30, fontWeight: 850}}>Bank connected</div>
            <div style={{
              width: 58,
              height: 58,
              borderRadius: 999,
              background: colors.green,
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontSize: 36,
              fontWeight: 900,
              transform: `scale(${interpolate(check, [0, 1], [0.4, 1])})`,
            }}>✓</div>
          </div>
          {rows.map((row, index) => (
            <div key={row[0]} style={{
              ...slideUp(frame, 28 + index * 7, 24),
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '22px 0',
              borderTop: index === 0 ? 'none' : `2px solid ${colors.border}`,
              fontSize: 30,
            }}>
              <span style={{color: colors.muted, fontWeight: 700}}>{row[0]}</span>
              <span style={{fontWeight: 900, color: colors.ink}}>{row[1]}</span>
            </div>
          ))}
        </div>
      </div>
    </SceneShell>
  );
}

function BenchmarksScene(props: PersonalFirePlanTeaserProps) {
  const frame = useCurrentFrame();
  const bar = enter(frame, 22, 24);
  const marker = interpolate(Math.sin(frame / 20), [-1, 1], [0.96, 1.04]);

  return (
    <SceneShell dark>
      <div style={slideUp(frame, 0)}>
        <HeaderBadge compact />
      </div>
      <div style={{marginTop: 125}}>
        <div style={{...slideUp(frame, 4), color: colors.teal, fontSize: 34, fontWeight: 900}}>
          City-aware benchmarks
        </div>
        <h2 style={{...slideUp(frame, 8), margin: '18px 0 44px', fontSize: 82, lineHeight: 0.98, letterSpacing: 0}}>
          Your money is compared to {props.city}.
        </h2>
        <div style={{
          ...slideUp(frame, 18),
          background: 'rgba(255,255,255,0.08)',
          border: '2px solid rgba(255,255,255,0.18)',
          borderRadius: 38,
          padding: 34,
        }}>
          <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 30, fontWeight: 850}}>
            <span>Rent ratio</span>
            <span>42%</span>
          </div>
          <div style={{height: 28, borderRadius: 999, background: 'rgba(255,255,255,0.16)', overflow: 'hidden', margin: '26px 0'}}>
            <div style={{
              width: `${interpolate(bar, [0, 1], [0, 42])}%`,
              height: '100%',
              background: `linear-gradient(90deg, ${colors.teal}, #f7d77d)`,
              borderRadius: 999,
              boxShadow: `0 0 ${interpolate(Math.sin(frame / 18), [-1, 1], [12, 28])}px rgba(46,203,179,0.48)`,
            }} />
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between', color: '#c6f5dd', fontSize: 24, fontWeight: 750}}>
            <span>Austin target: 28%</span>
            <span>Your current: 42%</span>
          </div>
          <div style={{
            marginTop: 26,
            width: 94,
            height: 94,
            borderRadius: 999,
            background: '#f4fff8',
            color: colors.greenDark,
            display: 'grid',
            placeItems: 'center',
            fontSize: 28,
            fontWeight: 950,
            transform: `translateX(${interpolate(bar, [0, 1], [0, 290])}px) scale(${marker})`,
          }}>
            42%
          </div>
        </div>
      </div>
    </SceneShell>
  );
}

function InsightCard({insight, index, frame}: {insight: SpendingInsight; index: number; frame: number}) {
  const toneColor = insight.tone === 'warning' ? colors.warning : insight.tone === 'positive' ? colors.green : colors.teal;
  const toneBg = insight.tone === 'warning' ? colors.warningBg : colors.greenSoft;
  const float = Math.sin((frame + index * 12) / 24) * 6;

  return (
    <div style={{
      ...slideUp(frame, 12 + index * 9, 32),
      background: colors.surface,
      border: `2px solid ${colors.border}`,
      borderRadius: 32,
      padding: 30,
      boxShadow: '0 20px 54px rgba(6, 63, 49, 0.10)',
      transform: `${slideUp(frame, 12 + index * 9, 32).transform} translateY(${float}px)`,
    }}>
      <div style={{display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16}}>
        <div style={{width: 22, height: 22, borderRadius: 999, background: toneColor}} />
        <div style={{fontSize: 28, fontWeight: 900, color: colors.ink}}>{insight.label}</div>
      </div>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div style={{fontSize: 46, fontWeight: 950, color: toneColor}}>{insight.value}</div>
        <div style={{
          padding: '12px 16px',
          borderRadius: 18,
          color: toneColor,
          background: toneBg,
          fontSize: 22,
          fontWeight: 850,
        }}>
          {insight.benchmark}
        </div>
      </div>
    </div>
  );
}

function InsightsScene(props: PersonalFirePlanTeaserProps) {
  const frame = useCurrentFrame();

  return (
    <SceneShell>
      <div style={slideUp(frame, 0)}>
        <HeaderBadge compact />
      </div>
      <div style={{marginTop: 88}}>
        <div style={{...slideUp(frame, 4), fontSize: 34, color: colors.green, fontWeight: 900}}>
          Personal guidance, not generic tips
        </div>
        <h2 style={{...slideUp(frame, 8), margin: '18px 0 36px', fontSize: 76, lineHeight: 1, letterSpacing: 0}}>
          It tells you what is actually off-track.
        </h2>
        <div style={{display: 'flex', flexDirection: 'column', gap: 22}}>
          {props.insights.map((insight, index) => (
            <InsightCard key={insight.label} insight={insight} index={index} frame={frame} />
          ))}
        </div>
      </div>
    </SceneShell>
  );
}

function TimelineScene(props: PersonalFirePlanTeaserProps) {
  const frame = useCurrentFrame();
  const progress = enter(frame, 22, 42);
  const markerShift = interpolate(progress, [0, 1], [72, 54]);
  const markerPulse = interpolate(Math.sin(frame / 15), [-1, 1], [0.95, 1.06]);

  return (
    <SceneShell dark>
      <div style={slideUp(frame, 0)}>
        <HeaderBadge compact />
      </div>
      <div style={{marginTop: 120}}>
        <div style={{...slideUp(frame, 4), color: colors.teal, fontSize: 34, fontWeight: 900}}>
          Plan monthly investing
        </div>
        <h2 style={{...slideUp(frame, 8), margin: '18px 0 42px', fontSize: 82, lineHeight: 0.98, letterSpacing: 0}}>
          See how compounding moves your FIRE date.
        </h2>
        <div style={{
          ...slideUp(frame, 18),
          height: 470,
          borderRadius: 38,
          background: 'rgba(255,255,255,0.08)',
          border: '2px solid rgba(255,255,255,0.18)',
          padding: 38,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <svg viewBox="0 0 840 300" width="100%" height="300" style={{overflow: 'visible'}}>
            <path d="M20 250 C 190 238, 320 208, 455 150 C 585 94, 700 54, 820 34" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="12" strokeLinecap="round" />
            <path
              d="M20 250 C 190 238, 320 208, 455 150 C 585 94, 700 54, 820 34"
              fill="none"
              stroke={colors.teal}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray="980"
              strokeDashoffset={interpolate(progress, [0, 1], [980, 0])}
            />
          </svg>
          <div style={{
            position: 'absolute',
            left: `${markerShift}%`,
            top: 134,
            transform: `translateX(-50%) scale(${markerPulse})`,
            display: 'grid',
            placeItems: 'center',
            width: 124,
            height: 124,
            borderRadius: 999,
            background: '#f4fff8',
            color: colors.greenDark,
            fontSize: 30,
            fontWeight: 950,
            boxShadow: '0 18px 50px rgba(0,0,0,0.22)',
          }}>
            {props.projectedFireDate}
          </div>
          <div style={{
            position: 'absolute',
            left: 38,
            right: 38,
            bottom: 36,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'end',
            color: '#e4fff0',
          }}>
            <div>
              <div style={{fontSize: 28, fontWeight: 850}}>Add {props.monthlyInvestmentPlan}</div>
              <div style={{fontSize: 22, color: '#b8ead0'}}>Planning only, no trade execution</div>
            </div>
            <div style={{fontSize: 42, fontWeight: 950, color: colors.teal}}>
              {props.timelineImpact}
            </div>
          </div>
        </div>
      </div>
    </SceneShell>
  );
}

function CtaScene(props: PersonalFirePlanTeaserProps) {
  const frame = useCurrentFrame();
  const pulse = interpolate(Math.sin(frame / 8), [-1, 1], [0.98, 1.03]);

  return (
    <SceneShell>
      <div style={{height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 42}}>
        <div style={slideUp(frame, 0)}>
          <HeaderBadge />
        </div>
        <h2 style={{
          ...slideUp(frame, 8),
          margin: 0,
          fontSize: 94,
          lineHeight: 0.98,
          letterSpacing: 0,
          fontWeight: 950,
        }}>
          Know what to change.
          <span style={{display: 'block', color: colors.green}}>Reach freedom sooner.</span>
        </h2>
        <div style={{
          ...slideUp(frame, 18),
          padding: '30px 36px',
          borderRadius: 34,
          background: colors.greenDark,
          color: '#f4fff8',
          fontSize: 38,
          fontWeight: 900,
          width: 'fit-content',
          transform: `${slideUp(frame, 18).transform} scale(${pulse})`,
          boxShadow: '0 24px 70px rgba(6, 63, 49, 0.22)',
        }}>
          {props.ctaText}
        </div>
        <div style={{...slideUp(frame, 28), fontSize: 30, color: colors.muted, fontWeight: 750}}>
          Financial Independence, Retire Early.
        </div>
      </div>
    </SceneShell>
  );
}

export const PersonalFirePlanTeaser = (props: PersonalFirePlanTeaserProps) => {
  return (
    <AbsoluteFill style={{background: colors.page}}>
      <CrossfadeScene from={0} duration={60}>
        <HookScene />
      </CrossfadeScene>
      <CrossfadeScene from={42} duration={90}>
        <BankScene {...props} />
      </CrossfadeScene>
      <CrossfadeScene from={114} duration={108}>
        <BenchmarksScene {...props} />
      </CrossfadeScene>
      <CrossfadeScene from={204} duration={126}>
        <InsightsScene {...props} />
      </CrossfadeScene>
      <CrossfadeScene from={312} duration={108}>
        <TimelineScene {...props} />
      </CrossfadeScene>
      <CrossfadeScene from={402} duration={78}>
        <CtaScene {...props} />
      </CrossfadeScene>
    </AbsoluteFill>
  );
};
