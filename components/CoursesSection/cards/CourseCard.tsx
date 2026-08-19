// Single course card. One field beyond name/description/price, picked for
// the learner: refundable (true/false). A buyer deciding right now cares
// most about whether they can get their money back. mainCategory is also
// surfaced as a quiet tag because it gives the card context at a glance.
import { motion } from "framer-motion"
import type { CardStyle, CountryCode, Course } from "../api/types.ts"
import { formatPrice } from "../api/coursesApi.ts"

export function CourseCard({
    course,
    countryCode,
    accent,
    cardStyle,
}: {
    course: Course
    countryCode: CountryCode | null
    accent: string
    cardStyle: CardStyle
}) {
    const cardBg: string =
        cardStyle === "filled" ? "#ffffff" :
        cardStyle === "outline" ? "transparent" :
        "#f8fafc"
    const cardBorder: string =
        cardStyle === "outline" ? `1px solid ${accent}33` :
        cardStyle === "subtle" ? "1px solid #e2e8f0" :
        "1px solid #e2e8f0"
    const cardShadow: string =
        cardStyle === "filled" ? "0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.04)" : "none"

    return (
        <motion.div
            whileHover={{ y: -2 }}
            transition={{ duration: 0.15 }}
            style={{
                background: cardBg,
                border: cardBorder,
                boxShadow: cardShadow,
                borderRadius: 14,
                padding: 18,
                display: "flex",
                flexDirection: "column",
                minHeight: 200,
                boxSizing: "border-box",
            }}
        >
            <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                <Tag accent={accent}>{course.mainCategory}</Tag>
            </div>

            <h3 style={{
                margin: 0,
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: 17,
                fontWeight: 600,
                lineHeight: 1.25,
                color: "#0f172a",
            }}>
                {course.courseName}
            </h3>

            <p style={{
                margin: "8px 0 0",
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: 13,
                lineHeight: 1.45,
                color: "#475569",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
            }}>
                {course.description}
            </p>

            <div style={{ flex: 1 }} />

            <div style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                marginTop: 14,
                gap: 10,
            }}>
                <div style={{
                    fontFamily: "Inter, system-ui, sans-serif",
                    fontSize: 18,
                    fontWeight: 700,
                    color: accent,
                    lineHeight: 1,
                }}>
                    {formatPrice(course, countryCode)}
                </div>

                {course.refundable === true && <RefundBadge accent={accent} />}
            </div>
        </motion.div>
    )
}

function RefundBadge({ accent }: { accent: string }) {
    return (
        <span style={{
            fontSize: 11,
            fontWeight: 600,
            fontFamily: "Inter, system-ui, sans-serif",
            padding: "4px 8px",
            borderRadius: 999,
            whiteSpace: "nowrap",
            background: `${accent}1a`,
            color: accent,
            border: `1px solid ${accent}33`,
        }}>
            Refundable
        </span>
    )
}

function Tag({ children, accent, soft }: { children: any; accent: string; soft?: boolean }) {
    return (
        <span style={{
            fontSize: 11,
            fontWeight: 500,
            fontFamily: "Inter, system-ui, sans-serif",
            padding: "3px 8px",
            borderRadius: 6,
            background: soft ? "transparent" : `${accent}14`,
            color: soft ? "#64748b" : accent,
            border: soft ? "1px solid #e2e8f0" : "none",
        }}>
            {children}
        </span>
    )
}