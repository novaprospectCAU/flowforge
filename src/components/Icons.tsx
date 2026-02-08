import { createElement } from 'react';

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

const defaultProps = { size: 16, color: 'currentColor', strokeWidth: 2 };

function svg(props: IconProps, ...children: Array<ReturnType<typeof createElement>>) {
  const { size, color } = { ...defaultProps, ...props };
  return createElement('svg', {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: props.strokeWidth ?? defaultProps.strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    style: { display: 'inline-block', verticalAlign: 'middle' },
  }, ...children);
}

// ---- Toolbar / Controls ----

export function IconUndo(props: IconProps = {}) {
  return svg(props,
    createElement('path', { d: 'M3 10h11a5 5 0 0 1 0 10H11' }),
    createElement('polyline', { points: '3 10 7 6' }),
    createElement('polyline', { points: '3 10 7 14' }),
  );
}

export function IconRedo(props: IconProps = {}) {
  return svg(props,
    createElement('path', { d: 'M21 10H10a5 5 0 0 0 0 10h3' }),
    createElement('polyline', { points: '21 10 17 6' }),
    createElement('polyline', { points: '21 10 17 14' }),
  );
}

export function IconDownload(props: IconProps = {}) {
  return svg(props,
    createElement('path', { d: 'M12 5v10' }),
    createElement('polyline', { points: '6 11 12 17 18 11' }),
    createElement('line', { x1: 5, y1: 20, x2: 19, y2: 20 }),
  );
}

export function IconUpload(props: IconProps = {}) {
  return svg(props,
    createElement('path', { d: 'M12 19V9' }),
    createElement('polyline', { points: '6 13 12 7 18 13' }),
    createElement('line', { x1: 5, y1: 4, x2: 19, y2: 4 }),
  );
}

export function IconKey(props: IconProps = {}) {
  return svg(props,
    createElement('circle', { cx: 8, cy: 15, r: 4 }),
    createElement('path', { d: 'M11.3 11.7 20 3' }),
    createElement('path', { d: 'M17 3h3v3' }),
    createElement('path', { d: 'M15 7l2 2' }),
  );
}

export function IconPlay(props: IconProps = {}) {
  return svg(props,
    createElement('polygon', { points: '6 3 20 12 6 21', fill: props.color ?? defaultProps.color, stroke: 'none' }),
  );
}

export function IconMenu(props: IconProps = {}) {
  return svg(props,
    createElement('line', { x1: 4, y1: 6, x2: 20, y2: 6 }),
    createElement('line', { x1: 4, y1: 12, x2: 20, y2: 12 }),
    createElement('line', { x1: 4, y1: 18, x2: 20, y2: 18 }),
  );
}

export function IconSearch(props: IconProps = {}) {
  return svg(props,
    createElement('circle', { cx: 11, cy: 11, r: 6 }),
    createElement('line', { x1: 16.5, y1: 16.5, x2: 21, y2: 21 }),
  );
}

export function IconClipboard(props: IconProps = {}) {
  return svg(props,
    createElement('rect', { x: 8, y: 2, width: 8, height: 4, rx: 1 }),
    createElement('path', { d: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2' }),
  );
}

export function IconSun(props: IconProps = {}) {
  return svg(props,
    createElement('circle', { cx: 12, cy: 12, r: 4 }),
    createElement('path', { d: 'M12 2v2' }),
    createElement('path', { d: 'M12 20v2' }),
    createElement('path', { d: 'M4.93 4.93l1.41 1.41' }),
    createElement('path', { d: 'M17.66 17.66l1.41 1.41' }),
    createElement('path', { d: 'M2 12h2' }),
    createElement('path', { d: 'M20 12h2' }),
    createElement('path', { d: 'M4.93 19.07l1.41-1.41' }),
    createElement('path', { d: 'M17.66 6.34l1.41-1.41' }),
  );
}

export function IconMoon(props: IconProps = {}) {
  return svg(props,
    createElement('path', { d: 'M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z' }),
  );
}

export function IconClose(props: IconProps = {}) {
  return svg(props,
    createElement('line', { x1: 18, y1: 6, x2: 6, y2: 18 }),
    createElement('line', { x1: 6, y1: 6, x2: 18, y2: 18 }),
  );
}

export function IconZoomOut(props: IconProps = {}) {
  return svg(props,
    createElement('circle', { cx: 11, cy: 11, r: 7 }),
    createElement('line', { x1: 8, y1: 11, x2: 14, y2: 11 }),
    createElement('line', { x1: 16.5, y1: 16.5, x2: 21, y2: 21 }),
  );
}

export function IconZoomIn(props: IconProps = {}) {
  return svg(props,
    createElement('circle', { cx: 11, cy: 11, r: 7 }),
    createElement('line', { x1: 8, y1: 11, x2: 14, y2: 11 }),
    createElement('line', { x1: 11, y1: 8, x2: 11, y2: 14 }),
    createElement('line', { x1: 16.5, y1: 16.5, x2: 21, y2: 21 }),
  );
}

export function IconFitView(props: IconProps = {}) {
  return svg(props,
    createElement('path', { d: 'M3 8V5a2 2 0 0 1 2-2h3' }),
    createElement('path', { d: 'M16 3h3a2 2 0 0 1 2 2v3' }),
    createElement('path', { d: 'M21 16v3a2 2 0 0 1-2 2h-3' }),
    createElement('path', { d: 'M8 21H5a2 2 0 0 1-2-2v-3' }),
  );
}

export function IconCenterView(props: IconProps = {}) {
  return svg(props,
    createElement('circle', { cx: 12, cy: 12, r: 3 }),
    createElement('path', { d: 'M3 8V5a2 2 0 0 1 2-2h3' }),
    createElement('path', { d: 'M16 3h3a2 2 0 0 1 2 2v3' }),
    createElement('path', { d: 'M21 16v3a2 2 0 0 1-2 2h-3' }),
    createElement('path', { d: 'M8 21H5a2 2 0 0 1-2-2v-3' }),
  );
}

export function IconTrash(props: IconProps = {}) {
  return svg(props,
    createElement('polyline', { points: '3 6 5 6 21 6' }),
    createElement('path', { d: 'M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6' }),
    createElement('path', { d: 'M10 11v6' }),
    createElement('path', { d: 'M14 11v6' }),
    createElement('path', { d: 'M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2' }),
  );
}

// ---- Onboarding ----

export function IconWave(props: IconProps = {}) {
  const { size, color } = { ...defaultProps, ...props };
  return createElement('svg', {
    width: size, height: size, viewBox: '0 0 24 24',
    fill: 'none', stroke: color, strokeWidth: 1.5,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
    style: { display: 'inline-block', verticalAlign: 'middle' },
  },
    createElement('path', { d: 'M7 11.5V7a2 2 0 0 1 4 0v3' }),
    createElement('path', { d: 'M11 9.5V5a2 2 0 0 1 4 0v5' }),
    createElement('path', { d: 'M15 9.5V7a2 2 0 0 1 4 0v7c0 4-3 7-7 7H9c-2 0-4.5-2.5-6-4' }),
    createElement('path', { d: 'M7 11.5a2 2 0 0 0-4 0v2' }),
  );
}

export function IconPlus(props: IconProps = {}) {
  return svg(props,
    createElement('line', { x1: 12, y1: 5, x2: 12, y2: 19 }),
    createElement('line', { x1: 5, y1: 12, x2: 19, y2: 12 }),
  );
}

export function IconLink(props: IconProps = {}) {
  return svg(props,
    createElement('path', { d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71' }),
    createElement('path', { d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' }),
  );
}

export function IconCompass(props: IconProps = {}) {
  return svg(props,
    createElement('circle', { cx: 12, cy: 12, r: 9 }),
    createElement('polygon', { points: '16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88', fill: props.color ?? defaultProps.color }),
  );
}

export function IconFolder(props: IconProps = {}) {
  return svg(props,
    createElement('path', { d: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z' }),
  );
}

export function IconPlayCircle(props: IconProps = {}) {
  return svg(props,
    createElement('circle', { cx: 12, cy: 12, r: 9 }),
    createElement('polygon', { points: '10 8 16 12 10 16', fill: props.color ?? defaultProps.color, stroke: 'none' }),
  );
}

export function IconParty(props: IconProps = {}) {
  return svg(props,
    createElement('path', { d: 'M5.8 11.3L2 22l10.7-3.8' }),
    createElement('path', { d: 'M4 3l2.5 2.5' }),
    createElement('path', { d: 'M14 6l2-2' }),
    createElement('path', { d: 'M18 10l2.5-2.5' }),
    createElement('path', { d: 'M12.4 2.3c.7-.3 1.5 0 2 .5l6.8 6.8c.5.5.8 1.3.5 2' }),
    createElement('path', { d: 'M5.8 11.3c-.3.7 0 1.5.5 2l4.4 4.4c.5.5 1.3.8 2 .5' }),
  );
}

export function IconCheck(props: IconProps = {}) {
  return svg(props,
    createElement('polyline', { points: '5 12 10 17 19 7' }),
  );
}

export function IconWarning(props: IconProps = {}) {
  return svg(props,
    createElement('path', { d: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' }),
    createElement('line', { x1: 12, y1: 9, x2: 12, y2: 13 }),
    createElement('circle', { cx: 12, cy: 17, r: 0.5, fill: props.color ?? defaultProps.color }),
  );
}

// Map onboarding icon keys to components
const onboardingIconMap: Record<string, (props: IconProps) => ReturnType<typeof createElement>> = {
  wave: IconWave,
  plus: IconPlus,
  link: IconLink,
  compass: IconCompass,
  folder: IconFolder,
  play: IconPlayCircle,
  party: IconParty,
};

export function OnboardingIcon({ name, size = 48, color }: { name: string; size?: number; color?: string }) {
  const Component = onboardingIconMap[name];
  if (!Component) return null;
  return Component({ size, color, strokeWidth: 1.5 });
}
