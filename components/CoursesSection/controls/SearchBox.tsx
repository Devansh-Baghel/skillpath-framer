// Compact ~240px search input on desktop; the flex parent wraps it under the
// subtitle on narrow viewports. Disabled until courses have loaded.
export function SearchBox({ value, onChange, disabled, accent }: any) {
    return (
        <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder="Search courses…"
            style={{
                width: 240,
                maxWidth: "100%",
                boxSizing: "border-box",
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: 13,
                color: "#0f172a",
                background: "#ffffff",
                border: `1px solid ${disabled ? "#e2e8f0" : accent + "55"}`,
                borderRadius: 10,
                padding: "8px 12px",
                outline: "none",
                cursor: disabled ? "not-allowed" : "text",
                opacity: disabled ? 0.55 : 1,
                transition: "border-color 0.15s, box-shadow 0.15s",
            }}
            onFocus={(e) => {
                if (disabled) return
                e.currentTarget.style.borderColor = accent
                e.currentTarget.style.boxShadow = `0 0 0 3px ${accent}22`
            }}
            onBlur={(e) => {
                e.currentTarget.style.borderColor = accent + "55"
                e.currentTarget.style.boxShadow = "none"
            }}
        />
    )
}