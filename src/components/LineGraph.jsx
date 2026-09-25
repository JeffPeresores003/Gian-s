import { useState, useId } from 'react';

/**
 * LineGraph - Pure SVG modern responsive line graph
 * Props:
 * - data: Array<{ label: string, value: number, count?: number, date?: string }>
 * - title: string
 * - subtitle?: string
 * - strokeColor?: string (hex)
 * - fillColor?: string (hex)
 * - yFormat?: (val: number) => string
 * - headerActions?: ReactNode (optional toggle buttons)
 */
export default function LineGraph({
  data = [],
  title = 'Revenue Performance Over Time',
  subtitle = '',
  strokeColor = '#c48b3f',
  fillColor = '#c48b3f',
  yFormat = (val) => `₱${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  headerActions = null,
}) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const gradId = useId().replace(/:/g, '_');

  if (!data || data.length === 0) {
    return (
      <div className="line-graph-card">
        <div className="line-graph-header">
          <div className="line-header-left">
            <h3 className="line-graph-title">{title}</h3>
            {subtitle && <p className="line-graph-sub">{subtitle}</p>}
          </div>
          {headerActions && <div className="line-header-controls">{headerActions}</div>}
        </div>
        <div className="chart-empty-state">
          <p className="chart-empty-title">No Trend Data</p>
          <p className="chart-empty-sub">No sales data logged for this period yet.</p>
        </div>
      </div>
    );
  }

  // Calculate bounds
  const values = data.map((d) => Number(d.value) || 0);
  const rawMax = Math.max(...values, 0);
  const maxVal = rawMax > 0 ? rawMax * 1.15 : 100; // 15% headroom for aesthetic spacing
  const minVal = 0;
  const totalVal = values.reduce((acc, v) => acc + v, 0);

  // Chart Dimensions
  const svgWidth = 720;
  const svgHeight = 260;
  const padding = { top: 30, right: 30, bottom: 45, left: 75 };

  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  // Coordinate mapping
  const isSingle = data.length === 1;
  const points = data.map((d, i) => {
    const x = isSingle
      ? padding.left + plotWidth / 2
      : padding.left + (i / (data.length - 1)) * plotWidth;
    const yRatio = (Number(d.value) - minVal) / (maxVal - minVal || 1);
    const y = padding.top + plotHeight - yRatio * plotHeight;
    return { x, y, ...d };
  });

  // Build path
  let linePath = '';
  let areaPath = '';

  if (isSingle) {
    // For single point: Draw a horizontal benchmark line across the chart
    const y = points[0].y;
    linePath = `M ${padding.left} ${y} L ${svgWidth - padding.right} ${y}`;
    areaPath = `M ${padding.left} ${y} L ${svgWidth - padding.right} ${y} L ${svgWidth - padding.right} ${padding.top + plotHeight} L ${padding.left} ${padding.top + plotHeight} Z`;
  } else if (points.length === 2) {
    linePath = `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
    areaPath = `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y} L ${points[1].x} ${padding.top + plotHeight} L ${points[0].x} ${padding.top + plotHeight} Z`;
  } else {
    // Build smooth cubic bezier curve
    linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      linePath += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + plotHeight} L ${points[0].x} ${padding.top + plotHeight} Z`;
  }

  // Generate 4 Y-axis ticks
  const yTicks = [0, 0.33, 0.66, 1].map((pct) => {
    const val = minVal + pct * (maxVal - minVal);
    const y = padding.top + plotHeight - pct * plotHeight;
    return { val, y };
  });

  const maxPoint = points.reduce(
    (prev, curr) => (Number(curr.value) > Number(prev.value) ? curr : prev),
    points[0]
  );

  const activePoint = hoveredIdx !== null ? points[hoveredIdx] : null;

  return (
    <div className="line-graph-card">
      <div className="line-graph-header">
        <div className="line-header-left">
          <h3 className="line-graph-title">{title}</h3>
          {subtitle && <p className="line-graph-sub">{subtitle}</p>}
        </div>

        <div className="line-header-right">
          {headerActions && <div className="line-header-controls">{headerActions}</div>}

          <div className="line-graph-metrics">
            <div className="line-graph-metric-pill">
              <span className="metric-pill-label">Total in Period:</span>
              <span className="metric-pill-val">{yFormat(totalVal)}</span>
            </div>
            <div className="line-graph-metric-pill highlight">
              <span className="metric-pill-label">Peak:</span>
              <span className="metric-pill-val">{yFormat(maxPoint.value)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="line-graph-svg-wrapper">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="line-graph-svg"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={`areaGrad_${gradId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fillColor} stopOpacity="0.35" />
              <stop offset="70%" stopColor={fillColor} stopOpacity="0.08" />
              <stop offset="100%" stopColor={fillColor} stopOpacity="0.0" />
            </linearGradient>

            <filter id={`glow_${gradId}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={strokeColor} floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Grid lines & Y-Axis Labels */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={padding.left}
                y1={tick.y}
                x2={svgWidth - padding.right}
                y2={tick.y}
                stroke="var(--color-border)"
                strokeDasharray="4 4"
                strokeWidth="1"
                opacity="0.75"
              />
              <text
                x={padding.left - 12}
                y={tick.y + 4}
                textAnchor="end"
                fontSize="11"
                fill="var(--color-muted)"
                fontWeight="500"
              >
                ₱{Math.round(tick.val).toLocaleString()}
              </text>
            </g>
          ))}

          {/* Gradient Area */}
          {areaPath && (
            <path
              d={areaPath}
              fill={`url(#areaGrad_${gradId})`}
              className="line-graph-area"
            />
          )}

          {/* Main Line */}
          <path
            d={linePath}
            fill="none"
            stroke={strokeColor}
            strokeWidth={isSingle ? "2.2" : "3.2"}
            strokeDasharray={isSingle ? "6 6" : "none"}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#glow_${gradId})`}
            className="line-graph-path"
          />

          {/* Hover guideline vertical bar */}
          {activePoint && !isSingle && (
            <line
              x1={activePoint.x}
              y1={padding.top}
              x2={activePoint.x}
              y2={padding.top + plotHeight}
              stroke={strokeColor}
              strokeWidth="1.5"
              strokeDasharray="3 3"
              opacity="0.8"
            />
          )}

          {/* Data Points */}
          {points.map((pt, i) => {
            const isHovered = hoveredIdx === i;
            return (
              <g
                key={i}
                className="line-graph-point-group"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => setHoveredIdx(hoveredIdx === i ? null : i)}
                style={{ cursor: 'pointer' }}
              >
                {/* Large touch/hover hit area */}
                <circle cx={pt.x} cy={pt.y} r="22" fill="transparent" />

                {/* Outer halo on hover */}
                {isHovered && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isSingle ? 14 : 11}
                    fill={strokeColor}
                    opacity="0.25"
                  />
                )}

                {/* Point dot */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 7 : (isSingle ? 6 : 4.5)}
                  fill="#ffffff"
                  stroke={strokeColor}
                  strokeWidth={isHovered ? 3.5 : 2.5}
                  className="line-graph-dot"
                />

                {/* X-axis Label */}
                {(points.length <= 12 ||
                  i % Math.ceil(points.length / 8) === 0 ||
                  i === points.length - 1) && (
                  <text
                    x={pt.x}
                    y={svgHeight - 12}
                    textAnchor="middle"
                    fontSize="11"
                    fill={isHovered ? strokeColor : 'var(--color-muted)'}
                    fontWeight={isHovered ? '700' : '500'}
                  >
                    {pt.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Dynamic Tooltip on Hover */}
        {activePoint && (
          <div
            className="line-graph-tooltip"
            style={{
              left: `${(activePoint.x / svgWidth) * 100}%`,
              top: `${(activePoint.y / svgHeight) * 100}%`,
            }}
          >
            <div className="tooltip-title">{activePoint.label}</div>
            <div className="tooltip-amount">{yFormat(activePoint.value)}</div>
            {activePoint.count !== undefined && (
              <div className="tooltip-count">
                {activePoint.count} order{activePoint.count !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
