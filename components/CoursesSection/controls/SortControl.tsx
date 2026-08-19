// Three-state segmented control: Default (API order) / Price ↑ / Price ↓.
// Sort key is priceUsdCents — every course has it regardless of which
// currency the country endpoint picked, so ordering is stable across a
// currency flip. Disabled while loading.
export function SortControl({ value, onChange, disabled, accent }: any) {
    const options: { key: string; label: string }[] = [
        { key: "none", label: "Default" },
        { key: "asc", label: "Price ↑" },
        { key: "desc", label: "Price ↓" },
    ]
    return (
        <div style={{
            display: "inline-flex",
            background: "#ffffff",
            border: `1px solid ${disabled ? "#e2e8f0" : accent + "55"}`,
            borderRadius: 10,
            padding: 3,
            opacity: disabled ? 0.55 : 1,
            cursor: disabled ? "not-allowed" : "default",
        }}>
            {options.map((opt) => {
                const active = value === opt.key
                return (
                    <button
                        key={opt.key}
                        type="button"
                        disabled={disabled}
                        onClick={() => onChange(opt.key)}
                        style={{
                            fontFamily: "Inter, system-ui, sans-serif",
                            fontSize: 12,
                            fontWeight: 600,
                            color: active ? "#fff" : (disabled ? "#94a3b8" : "#475569"),
                            background: active ? accent : "transparent",
                            border: "none",
                            borderRadius: 7,
                            padding: "6px 10px",
                            cursor: disabled ? "not-allowed" : "pointer",
                            lineHeight: 1,
                            whiteSpace: "nowrap",
                        }}
                    >
                        {opt.label}
                    </button>
                )
            })}
        </div>
    )
}