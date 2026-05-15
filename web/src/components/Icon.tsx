interface Props {
  name: string;
  size?: number;
  filled?: boolean;
  className?: string;
}

export default function Icon({ name, size = 20, filled, className = '' }: Props) {
  const style: React.CSSProperties = {
    fontSize: size,
    fontVariationSettings: filled
      ? "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24"
      : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
  };
  return (
    <span className={`material-symbols-outlined ${className}`} style={style}>{name}</span>
  );
}
