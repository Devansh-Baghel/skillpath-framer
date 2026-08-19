// Developer-only floating overlay for inspecting each state without waiting
// for the flaky API to oblige. Rendered via React Portal at document.body so
// it escapes any parent stacking context. Shown in Framer preview only —
// never on canvas, never in export/thumbnail. Refresh refetches both
// endpoints for real; the four small buttons force a status for preview.
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { motion } from "framer-motion"
import { RenderTarget } from "framer"
import type { Status } from "../api/types.ts"

const DEV_STATES: { key: Status; label: string }[] = [
    { key: "loading", label: "Load" },
    { key: "error", label: "Error" },
    { key: "empty", label: "Zero" },
    { key: "working", label: "Default" },
]

export function DevPill({ accent, forcedStatus, effectiveStatus, onRefresh, onForce }: {
    accent: string
    forcedStatus: Status | null
    effectiveStatus: Status
    onRefresh: () => void
    onForce: (s: Status | null) => void
}) {
    const [isClient, setIsClient] = useState(false)
    const [dismissed, setDismissed] = useState(false)

    useEffect(() => {
        setIsClient(true)
    }, [])

    // Hide on canvas, export, thumbnail — preview only.
    if (!isClient) return null
    if (RenderTarget.current() !== RenderTarget.preview) return null
    if (dismissed) return null

    return createPortal(
        <div style={{
            position: "fixed",
            bottom: 16,
            left: 16,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 8px",
            background: "rgba(15, 23, 42, 0.92)",
            backdropFilter: "blur(8px)",
            borderRadius: 999,
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.25)",
            fontFamily: "Inter, system-ui, sans-serif",
            color: "#e2e8f0",
            fontSize: 11,
            fontWeight: 600,
            userSelect: "none",
        }}>
            <DevButton accent={accent} primary onClick={onRefresh} title="Refresh data">
                ⟳ Refresh
            </DevButton>

            <span style={{ width: 1, height: 18, background: "rgba(255,255,255,0.15)" }} />

            {DEV_STATES.map((s) => {
                const active = forcedStatus === s.key
                const current = effectiveStatus === s.key
                return (
                    <DevButton
                        key={s.key}
                        accent={accent}
                        active={active}
                        current={current}
                        onClick={() => onForce(active ? null : s.key)}
                        title={`Force ${s.label} state`}
                    >
                        {s.label}
                    </DevButton>
                )
            })}

            <span style={{ width: 1, height: 18, background: "rgba(255,255,255,0.15)" }} />

            <DevButton accent={accent} onClick={() => setDismissed(true)} title="Hide dev pill">
                ✕
            </DevButton>
        </div>,
        document.body
    )
}

function DevButton({ children, accent, primary, active, current, onClick, title }: any) {
    let bg = "transparent"
    let color = "#cbd5e1"
    let border = "1px solid rgba(255,255,255,0.18)"
    if (current) {
        bg = `${accent}22`
        color = "#fff"
        border = `1px solid ${accent}`
    }
    if (active) {
        bg = accent
        color = "#fff"
        border = `1px solid ${accent}`
    }
    if (primary) {
        bg = accent
        color = "#fff"
        border = `1px solid ${accent}`
    }
    return (
        <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={onClick}
            title={title}
            style={{
                background: bg,
                color,
                border,
                borderRadius: 999,
                padding: "5px 10px",
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "Inter, system-ui, sans-serif",
                cursor: "pointer",
                lineHeight: 1,
                whiteSpace: "nowrap",
            }}
        >
            {children}
        </motion.button>
    )
}