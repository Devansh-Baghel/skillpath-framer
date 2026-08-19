// Status render shells + canvas placeholder. All "what does a non-working
// state look like" lives here. The shell owns the heading + a slot for the
// heading controls so layout is represented in every state.
import { motion } from "framer-motion"
import type { CardStyle } from "../api/types.ts"
import { SectionHeading } from "../layout/SectionHeading.tsx"
import { ResponsiveGrid, CardShell } from "../grid/CourseGrid.tsx"

export function StateShell({ style, accent, title, subtitle, searchBox, children }: any) {
    return (
        <div style={{ ...style, padding: 24 }}>
            <SectionHeading accent={accent} title={title} subtitle={subtitle} searchBox={searchBox} />
            {children}
        </div>
    )
}

// Shown only when courses are loaded but the current query matches nothing.
// Distinct from the API-returned-empty state: the catalog is fine, the
// filter is just too narrow. Search box stays enabled so the user can refine.
export function NoMatchState({ query, accent, onClear }: { query: string; accent: string; onClear: () => void }) {
    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "48px 24px",
            borderRadius: 14,
            border: "1px dashed #cbd5e1",
            background: "#f8fafc",
        }}>
            <div style={{
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: 15,
                fontWeight: 600,
                color: "#0f172a",
            }}>
                No courses match &ldquo;{query}&rdquo;
            </div>
            <p style={{
                margin: "6px 0 16px",
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: 13,
                color: "#64748b",
            }}>
                Try a different keyword, or clear the search.
            </p>
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClear}
                style={{
                    fontFamily: "Inter, system-ui, sans-serif",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#fff",
                    background: accent,
                    border: "none",
                    borderRadius: 8,
                    padding: "8px 16px",
                    cursor: "pointer",
                }}
            >
                Clear search
            </motion.button>
        </div>
    )
}

export function RetryButton({ accent, onClick }: { accent: string; onClick: () => void }) {
    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            style={{
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: 14,
                fontWeight: 600,
                color: "#fff",
                background: accent,
                border: "none",
                borderRadius: 10,
                padding: "10px 18px",
                cursor: "pointer",
            }}
        >
            Try again
        </motion.button>
    )
}

export function CanvasPlaceholder({ style, accent, cardStyle, searchBox }: {
    style: any
    accent: string
    cardStyle: CardStyle
    searchBox: any
}) {
    return (
        <div style={{ ...style, boxSizing: "border-box", width: "100%", padding: 24 }}>
            <SectionHeading
                accent={accent}
                title="Courses"
                subtitle="Live data grid — 3 / 2 / 1 columns"
                searchBox={searchBox}
            />
            <ResponsiveGrid>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                    <CardShell key={i} accent={accent} cardStyle={cardStyle} muted>
                        <div style={{ height: 16, width: "60%", background: accent, opacity: 0.35, borderRadius: 4 }} />
                        <div style={{ height: 10, width: "100%", background: "#cbd5e1", opacity: 0.5, marginTop: 10, borderRadius: 4 }} />
                        <div style={{ height: 10, width: "85%", background: "#cbd5e1", opacity: 0.5, marginTop: 6, borderRadius: 4 }} />
                        <div style={{ flex: 1 }} />
                        <div style={{ height: 14, width: "30%", background: accent, opacity: 0.25, borderRadius: 4 }} />
                    </CardShell>
                ))}
            </ResponsiveGrid>
        </div>
    )
}