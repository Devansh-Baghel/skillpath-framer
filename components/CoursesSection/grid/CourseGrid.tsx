// CSS-grid primitives + skeletons. No state, no data — pure layout.
import { motion } from "framer-motion"
import type { CardStyle } from "../api/types.ts"

// 3 / 2 / 1 with a single minmax rule. A 320px floor lands on 3 columns at
// ~1080px, 2 at ~768px, 1 below ~480px. CSS Grid handles uneven card counts
// without leaving gaps — no JS column math, no fixed item count assumed.
export function ResponsiveGrid({ children }: any) {
    return (
        <div
            style={{
                display: "grid",
                gap: 16,
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                width: "100%",
            }}
        >
            {children}
        </div>
    )
}

export function CardShell({ accent, cardStyle, muted, children }: any) {
    const cardBg: string =
        cardStyle === "filled" ? "#ffffff" :
        cardStyle === "outline" ? "transparent" :
        "#f8fafc"
    const cardBorder: string =
        cardStyle === "outline" ? `1px solid ${accent}33` :
        "1px solid #e2e8f0"
    return (
        <div style={{
            background: cardBg,
            border: cardBorder,
            borderRadius: 14,
            padding: 18,
            display: "flex",
            flexDirection: "column",
            minHeight: 200,
            opacity: muted ? 0.6 : 1,
            boxSizing: "border-box",
        }}>
            {children}
        </div>
    )
}

export function GridSkeleton({ accent, cardStyle }: { accent: string; cardStyle: CardStyle }) {
    return (
        <ResponsiveGrid>
            {[0, 1, 2, 3, 4, 5].map((i) => (
                <motion.div
                    key={i}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.08 }}
                >
                    <CardShell accent={accent} cardStyle={cardStyle} muted>
                        <div style={{ height: 16, width: "60%", background: accent, opacity: 0.35, borderRadius: 4 }} />
                        <div style={{ height: 10, width: "100%", background: "#cbd5e1", marginTop: 10, borderRadius: 4 }} />
                        <div style={{ height: 10, width: "85%", background: "#cbd5e1", marginTop: 6, borderRadius: 4 }} />
                        <div style={{ flex: 1 }} />
                        <div style={{ height: 14, width: "30%", background: accent, opacity: 0.25, borderRadius: 4 }} />
                    </CardShell>
                </motion.div>
            ))}
        </ResponsiveGrid>
    )
}