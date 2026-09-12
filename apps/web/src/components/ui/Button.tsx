import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

type Variant = 'primary' | 'outline';
type Size = 'default' | 'large' | 'compact';

const BASE =
  'group relative inline-flex items-center gap-xs overflow-hidden rounded-full font-heading font-medium transition-all duration-[400ms] ease-smooth';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-canvas hover:-translate-y-0.5 hover:shadow-glow-strong',
  outline: 'border border-white/28 text-ink hover:border-ink hover:bg-white/6',
};

const SIZES: Record<Size, string> = {
  default: 'px-7 py-3.5 text-small',
  large: 'px-10 py-[1.125rem] text-body',
  compact: 'px-4 py-2 text-caption',
};

interface ButtonProps {
  as?: ElementType;
  variant?: Variant;
  size?: Size;
  arrow?: boolean;
  className?: string;
  children: ReactNode;
}

export function Button({
  as,
  variant = 'primary',
  size = 'default',
  arrow = false,
  className = '',
  children,
  ...rest
}: ButtonProps & Omit<ComponentPropsWithoutRef<'a'>, 'className' | 'children'>) {
  const Tag = as ?? 'a';

  return (
    <Tag className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`} {...rest}>
      <span className="relative z-10">{children}</span>
      {arrow && (
        <span className="relative z-10 transition-transform duration-200 ease-smooth group-hover:translate-x-1">
          →
        </span>
      )}
    </Tag>
  );
}
