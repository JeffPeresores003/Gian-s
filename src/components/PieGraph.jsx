import { useState } from 'react';

const DEFAULT_PALETTE = [
  '#C48B3F', // Artisan Caramel
  '#2C1810', // Deep Espresso
  '#16A34A', // Emerald
  '#D4A96A', // Golden Crema
  '#4F46E5', // Indigo
  '#DC2626', // Crimson Roast
  '#0284C7', // Sky Blue
  '#D97706', // Amber
  '#7C3AED', // Purple
  '#059669', // Forest Sage
];

/**
 * PieGraph - Pure SVG Donut & Pie Chart with interactive hover/touch tooltips & legend
 * Props:
 * - data: Array<{ label: string, value: number, count?: number }>
 * - title: string
 * - subtitle?: string
 * - donut?: boolean (default true)
 * - colorPalette?: string[]
 * - valuePrefix?: string (default '₱')
 * - headerActions?: ReactNode (optional toggle buttons)
 */
export default function PieGraph({
  data = [],
  title = 'Sales Breakdown',
  subtitle = '',
  donut = true,
  colorPalette = DEFAULT_PALETTE,
  valuePrefix = '₱',
  headerActions = null,
  onItemClick = null,
  selectedLabel = null,
}) {
  const [hoveredIdx, setHoveredIdx] = useState(null);


  // Filter out non-positive values
  const validData = data.filter((d) => Number(d.value) > 0);
  const totalValue = validData.reduce((acc, curr) => acc + Number(curr.value), 0);

  if (validData.length === 0 || totalValue === 0) {
    return (
      <div className="pie-graph-card">
        <div className="pie-graph-header">
          <div className="pie-header-text">
            <h3 className="pie-graph-title">{title}</h3>
            {subtitle && <p className="pie-graph-sub">{subtitle}</p>}
          </div>
          {headerActions && <div className="pie-header-actions">{headerActions}</div>}
        </div>
        <div className="chart-empty-state">
          <p className="chart-empty-title">No Records Found</p>
          <p className="chart-empty-sub">No sales volume logged for this category or filter.</p>
        </div>
      </div>
    );
  }

  // Chart geometry
  const size = 260;
  const center = size / 2;
  const radius = 105;
  const innerRadius = donut ? 66 : 0;
  const donutStrokeWidth = radius - innerRadius;
  const donutMidRadius = (radius + innerRadius) / 2;

  // Single-item case: Render as a full circle/ring to avoid degenerate 360° SVG arc bug
  const isSingleSlice = validData.length === 1;

  let cumulativeAngle = -Math.PI / 2; // Start from 12 o'clock

  const slices = validData.map((d, i) => {
    const val = Number(d.value);
    const fraction = val / totalValue;
    // Clamp angle slightly below 2*PI if multiple slices exist to prevent degenerate arc
    const rawAngle = fraction * 2 * Math.PI;
    const angle = !isSingleSlice && rawAngle >= 2 * Math.PI ? 2 * Math.PI * 0.9999 : rawAngle;

    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle = endAngle;

    const color = d.color || colorPalette[i % colorPalette.length];

    let pathData = '';
    if (!isSingleSlice) {
      const x1 = center + radius * Math.cos(startAngle);
      const y1 = center + radius * Math.sin(startAngle);
      const x2 = center + radius * Math.cos(endAngle);
      const y2 = center + radius * Math.sin(endAngle);
      const largeArc = angle > Math.PI ? 1 : 0;

      if (innerRadius > 0) {
        const ix1 = center + innerRadius * Math.cos(endAngle);
        const iy1 = center + innerRadius * Math.sin(endAngle);
        const ix2 = center + innerRadius * Math.cos(startAngle);
        const iy2 = center + innerRadius * Math.sin(startAngle);

        pathData = `
          M ${x1.toFixed(2)} ${y1.toFixed(2)}
          A ${radius} ${radius} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}
          L ${ix1.toFixed(2)} ${iy1.toFixed(2)}
          A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix2.toFixed(2)} ${iy2.toFixed(2)}
          Z
        `;
      } else {
        pathData = `
          M ${center} ${center}
          L ${x1.toFixed(2)} ${y1.toFixed(2)}
          A ${radius} ${radius} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}
          Z
        `;
      }
    }

    return {
      ...d,
      value: val,
      percentage: (fraction * 100).toFixed(1),
      color,
      pathData,
      startAngle,
      endAngle,
      fraction,
    };
  });

  const selectedIdx = selectedLabel
    ? slices.findIndex((s) => s.label?.toLowerCase() === String(selectedLabel).toLowerCase())
    : -1;
  const currentActiveIdx = hoveredIdx !== null ? hoveredIdx : (selectedIdx >= 0 ? selectedIdx : null);
  const activeSlice = currentActiveIdx !== null ? slices[currentActiveIdx] : null;

  const handleSliceClick = (slice, i) => {
    setHoveredIdx(hoveredIdx === i ? null : i);
    if (onItemClick) {
      onItemClick(slice);
    }
  };

  return (
    <div className={`pie-graph-card ${onItemClick ? 'interactive-pie' : ''}`}>
      <div className="pie-graph-header">
        <div className="pie-header-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 className="pie-graph-title">{title}</h3>
            {onItemClick && (
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: 'var(--color-brand-mid, #c48b3f)',
                  background: 'rgba(196, 139, 63, 0.1)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Clickable
              </span>
            )}
          </div>
          {subtitle && <p className="pie-graph-sub">{subtitle}</p>}
        </div>
        {headerActions && <div className="pie-header-actions">{headerActions}</div>}
      </div>

      <div className="pie-graph-body">
        {/* SVG Donut / Pie */}
        <div className="pie-svg-container">
          <svg
            viewBox={`0 0 ${size} ${size}`}
            className="pie-svg"
            style={{ width: `${size}px`, height: `${size}px` }}
          >
            <defs>
              <filter id="pie-slice-glow" x="-15%" y="-15%" width="130%" height="130%">
                <feDropShadow dx="0" dy="2" stdDeviation="5" floodOpacity="0.3" floodColor="#2C1810" />
              </filter>
            </defs>

            {/* If single slice: draw perfect circular ring */}
            {isSingleSlice ? (
              donut ? (
                <circle
                  cx={center}
                  cy={center}
                  r={donutMidRadius}
                  fill="none"
                  stroke={slices[0].color}
                  strokeWidth={donutStrokeWidth}
                  className="pie-slice"
                  style={{
                    cursor: onItemClick ? 'pointer' : 'default',
                    transition: 'all 0.25s ease',
                    transformOrigin: `${center}px ${center}px`,
                    transform: currentActiveIdx === 0 ? 'scale(1.03)' : 'scale(1)',
                    filter: currentActiveIdx === 0 ? 'url(#pie-slice-glow)' : 'none',
                  }}
                  onMouseEnter={() => setHoveredIdx(0)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onClick={() => handleSliceClick(slices[0], 0)}
                />
              ) : (
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill={slices[0].color}
                  className="pie-slice"
                  style={{
                    cursor: onItemClick ? 'pointer' : 'default',
                    transition: 'all 0.25s ease',
                    transformOrigin: `${center}px ${center}px`,
                    transform: currentActiveIdx === 0 ? 'scale(1.03)' : 'scale(1)',
                    filter: currentActiveIdx === 0 ? 'url(#pie-slice-glow)' : 'none',
                  }}
                  onMouseEnter={() => setHoveredIdx(0)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onClick={() => handleSliceClick(slices[0], 0)}
                />
              )
            ) : (
              /* Multiple slices */
              slices.map((slice, i) => {
                const isHovered = currentActiveIdx === i;
                return (
                  <path
                    key={i}
                    d={slice.pathData}
                    fill={slice.color}
                    stroke="var(--color-surface)"
                    strokeWidth="2.5"
                    className="pie-slice"
                    style={{
                      cursor: 'pointer',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      opacity: currentActiveIdx !== null && !isHovered ? 0.42 : 1,
                      transformOrigin: `${center}px ${center}px`,
                      transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                      filter: isHovered ? 'url(#pie-slice-glow)' : 'none',
                    }}
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    onClick={() => handleSliceClick(slice, i)}
                  />
                );
              })
            )}
          </svg>

          {/* Center Callout inside Donut */}
          {donut && (
            <div className="pie-donut-center" pointerEvents="none">
              {activeSlice ? (
                <>
                  <span className="donut-center-pct">{activeSlice.percentage}%</span>
                  <span className="donut-center-label" title={activeSlice.label}>
                    {activeSlice.label}
                  </span>
                  <span className="donut-center-val">
                    {valuePrefix}{Number(activeSlice.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </>
              ) : (
                <>
                  <span className="donut-center-caption">Total Volume</span>
                  <span className="donut-center-total">
                    {valuePrefix}{totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="donut-center-sub">
                    {validData.length} item{validData.length !== 1 ? 's' : ''}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Legend List */}
        <div className="pie-legend-list">
          {slices.map((slice, i) => {
            const isHovered = currentActiveIdx === i;
            return (
              <div
                key={i}
                className={`pie-legend-item ${isHovered ? 'active' : ''}`}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => handleSliceClick(slice, i)}
                style={{
                  cursor: 'pointer',
                  outline: isHovered ? `2px solid ${slice.color}` : 'none',
                  borderRadius: '6px',
                  padding: '4px 6px',
                }}
                title={onItemClick ? `Click to view breakdown for ${slice.label}` : ''}
              >
                <div className="pie-legend-info">
                  <span
                    className="pie-legend-dot"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="pie-legend-label" title={slice.label}>
                    {slice.label}
                  </span>
                </div>

                <div className="pie-legend-stats">
                  <span className="pie-legend-amount">
                    {valuePrefix}{Number(slice.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="pie-legend-pct">{slice.percentage}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
