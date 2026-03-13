interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6 animate-slide-in-down">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#EDE8FF', letterSpacing: '-0.02em' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm mt-0.5 font-medium" style={{ color: '#2E2C4A' }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0 ml-4">{action}</div>}
    </div>
  );
}
