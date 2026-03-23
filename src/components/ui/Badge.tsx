interface BadgeProps {
  label: string;
  color?: string;
  textColor?: string;
  size?: 'sm' | 'md';
}
export function Badge({ label, color = '#f1f5f9', textColor = '#475569', size = 'md' }: BadgeProps) {
  const px = size === 'sm' ? '6px' : '10px';
  const py = size === 'sm' ? '2px' : '4px';
  const fontSize = size === 'sm' ? '11px' : '12px';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: `${py} ${px}`, borderRadius: '9999px',
      fontSize, fontWeight: 600, background: color, color: textColor,
      whiteSpace: 'nowrap', lineHeight: 1.4,
    }}>
      {label}
    </span>
  );
}
