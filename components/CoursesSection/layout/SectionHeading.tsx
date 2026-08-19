// Section heading: eyebrow + title + (subtitle left, searchBox right) row.
// The subtitle row is a flex container that wraps the search box under the
// subtitle on narrow viewports.
export function SectionHeading({ accent, title, subtitle, searchBox }: any) {
    return (
        <div style={{ marginBottom: 20 }}>
            <div style={{
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: accent,
            }}>
                Catalog
            </div>
            <h2 style={{
                margin: "4px 0 0",
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: 26,
                fontWeight: 700,
                color: "#0f172a",
                lineHeight: 1.15,
            }}>
                {title}
            </h2>
            {(subtitle || searchBox) && (
                <div style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    marginTop: 6,
                }}>
                    {subtitle && (
                        <p style={{
                            margin: 0,
                            fontFamily: "Inter, system-ui, sans-serif",
                            fontSize: 13,
                            color: "#64748b",
                            flex: "1 1 240px",
                        }}>
                            {subtitle}
                        </p>
                    )}
                    {searchBox && <div style={{ flex: "0 0 auto", marginLeft: "auto" }}>{searchBox}</div>}
                </div>
            )}
        </div>
    )
}