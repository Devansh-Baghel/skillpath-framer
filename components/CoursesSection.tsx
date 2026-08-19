import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { motion } from "framer-motion"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

/**
 * CoursesSection — fetches live course data from the Syncsphere API and
 * renders a responsive 3 / 2 / 1 grid of course cards.
 *
 * @framerDisableUnlink
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight auto
 * @framerIntrinsicWidth 1080
 * @framerIntrinsicHeight 720
 */

const API_BASE = "https://syncsphere-hiv6.onrender.com"
const COURSES_PATH = "/assignment/course-data"
const COUNTRY_PATH = "/assignment/country-code"

// The API fails on purpose ~1/3 of the time (404/500). Retry a few times
// before giving up — most loads resolve on the 2nd or 3rd hit.
const MAX_ATTEMPTS = 4

// A designer would want to brand the grid. Two controls, both things a
// non-coder can sensibly change from the Framer panel.
type AccentColor = string
type CardStyle = "filled" | "outline" | "subtle"

interface Course {
    courseName: string
    courseCode: string
    description: string
    mainCategory: string
    shortCourse: string
    courseType: string
    pricePaise: number
    priceUsdCents: number
    mangoId: string
    refundable: boolean
}

type CountryCode = "IN" | "US"

type Status = "loading" | "error" | "empty" | "working"
type SortOrder = "none" | "asc" | "desc"

interface FetchedState {
    status: Status
    courses: Course[]
    countryCode: CountryCode | null // null when country call failed but courses worked
    error?: string
}

// Unwrap a ControlType.Color value that may arrive as { value: "#xxx" } when
// the user binds a Framer color token, or as a plain string otherwise.
const tok = (v: any): string =>
    v && typeof v === "object" && "value" in v ? v.value : v

// --- Price formatting ------------------------------------------------------
// Units matter. pricePaise is paise (100 paise = 1 rupee), priceUsdCents is
// cents (100 cents = 1 dollar). Don't render the raw number.
const formatInr = (paise: number): string =>
    "₹" + (paise / 100).toLocaleString("en-IN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    })

const formatUsd = (cents: number): string =>
    "$" + (cents / 100).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })

// When the country call fails, we don't know which currency to show. Showing
// nothing is wrong; showing both is honest. The learner can tell which one
// applies to them.
const formatPrice = (course: Course, country: CountryCode | null): string => {
    if (country === "IN") return formatInr(course.pricePaise)
    if (country === "US") return formatUsd(course.priceUsdCents)
    return `${formatInr(course.pricePaise)} · ${formatUsd(course.priceUsdCents)}`
}

// --- Fetch with retry ------------------------------------------------------
async function fetchJson(url: string, attempts = MAX_ATTEMPTS): Promise<any> {
    let lastErr: any
    for (let i = 0; i < attempts; i++) {
        try {
            const res = await fetch(url, { method: "GET" })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            return await res.json()
        } catch (e) {
            lastErr = e
            // small backoff so we don't hammer a cold render instance
            await new Promise((r) => setTimeout(r, 250 * (i + 1)))
        }
    }
    throw lastErr
}

// Load both endpoints in parallel. Each retries independently. The spec
// calls out the edge case: country call may fail while courses succeed.
// We surface courses anyway and mark country unknown — never blank the page.
async function loadAll(): Promise<FetchedState> {
    const [coursesRes, countryRes] = await Promise.allSettled([
        fetchJson(API_BASE + COURSES_PATH),
        fetchJson(API_BASE + COUNTRY_PATH),
    ])

    if (coursesRes.status === "rejected") {
        return {
            status: "error",
            courses: [],
            countryCode: null,
            error: "Couldn't reach the course catalog. Please try again.",
        }
    }

    const coursesData = coursesRes.value
    if (!Array.isArray(coursesData) || coursesData.length === 0) {
        // Catalog responded but empty array — distinct from a failed fetch.
        return { status: "empty", courses: [], countryCode: null }
    }

    let countryCode: CountryCode | null = null
    if (countryRes.status === "fulfilled") {
        const cc = countryRes.value?.country_code
        if (cc === "IN" || cc === "US") countryCode = cc
    }

    return { status: "working", courses: coursesData, countryCode }
}

export default function CoursesSection(props: any) {
    const {
        style,
        accentColor = "#4f46e5",
        cardStyle = "filled",
    } = props

    const accent = tok(accentColor)

    // SSR / canvas: don't hit the network on the Framer canvas, don't touch
    // browser APIs during server render. Two-phase hydration — start false,
    // flip in an effect.
    const [isClient, setIsClient] = useState(false)
    const [state, setState] = useState<FetchedState>({
        status: "loading",
        courses: [],
        countryCode: null,
    })
    const [query, setQuery] = useState("")
    const [sortOrder, setSortOrder] = useState<SortOrder>("none")
    // Developer-only override: when non-null, the component renders this status
    // instead of the real one. Set by the floating DevPill. Cleared by Refresh.
    const [forcedStatus, setForcedStatus] = useState<Status | null>(null)

    useEffect(() => {
        setIsClient(true)
    }, [])

    const reload = () => {
        setForcedStatus(null)
        setQuery("")
        setSortOrder("none")
        setState({ status: "loading", courses: [], countryCode: null })
        loadAll().then((s) => setState(s))
    }

    useEffect(() => {
        if (!isClient) return
        if (RenderTarget.current() === RenderTarget.canvas) return
        let mounted = true
        setState({ status: "loading", courses: [], countryCode: null })
        loadAll().then((s) => {
            if (mounted) setState(s)
        })
        return () => {
            mounted = false
        }
    }, [isClient])

    // Local search — no debounce, filters synchronously on every keystroke.
    // Scope is course name + description only. Empty query = all courses.
    const filteredCourses = useMemo(() => {
        if (state.status !== "working") return state.courses
        const q = query.trim().toLowerCase()
        if (!q) return state.courses
        return state.courses.filter(
            (c) =>
                (c.courseName || "").toLowerCase().includes(q) ||
                (c.description || "").toLowerCase().includes(q)
        )
    }, [state, query])

    // Sort is applied AFTER filter. Every course carries both pricePaise and
    // priceUsdCents regardless of which currency the country endpoint picks,
    // so we sort on priceUsdCents as a canonical key — the order is identical
    // whether the displayed currency is IN or US, and doesn't reshuffle on a
    // country flip. "none" preserves API order.
    const displayCourses = useMemo(() => {
        if (sortOrder === "none") return filteredCourses
        const sorted = [...filteredCourses].sort(
            (a, b) => (a.priceUsdCents ?? 0) - (b.priceUsdCents ?? 0)
        )
        return sortOrder === "desc" ? sorted.reverse() : sorted
    }, [filteredCourses, sortOrder])

    // Canvas placeholder — never fetches, always deterministic.
    if (!isClient || RenderTarget.current() === RenderTarget.canvas) {
        return <CanvasPlaceholder style={style} accent={accent} cardStyle={cardStyle} />
    }

    const containerStyle: React.CSSProperties = {
        ...style,
        boxSizing: "border-box",
        width: "100%",
    }

    const effectiveStatus: Status = forcedStatus ?? state.status

    const content = (() => {
        if (effectiveStatus === "loading") {
            return (
                <StateShell
                    style={containerStyle}
                    accent={accent}
                    title="Loading courses…"
                    searchBox={
                        <HeadingControls
                            query={query}
                            onQueryChange={setQuery}
                            searchDisabled={true}
                            sortOrder={sortOrder}
                            onSortChange={setSortOrder}
                            sortDisabled={true}
                            accent={accent}
                        />
                    }
                >
                    <GridSkeleton accent={accent} cardStyle={cardStyle} />
                </StateShell>
            )
        }

        if (effectiveStatus === "error") {
            return (
                <StateShell
                    style={containerStyle}
                    accent={accent}
                    title="Something went wrong"
                    subtitle={
                        forcedStatus === "error"
                            ? "Forced error state (developer preview)."
                            : state.error
                    }
                    searchBox={
                        <HeadingControls
                            query={query}
                            onQueryChange={setQuery}
                            searchDisabled={true}
                            sortOrder={sortOrder}
                            onSortChange={setSortOrder}
                            sortDisabled={true}
                            accent={accent}
                        />
                    }
                >
                    <RetryButton accent={accent} onClick={reload} />
                </StateShell>
            )
        }

        if (effectiveStatus === "empty") {
            return (
                <StateShell
                    style={containerStyle}
                    accent={accent}
                    title="No courses available"
                    subtitle="The catalog returned empty. Check back shortly."
                    searchBox={
                        <HeadingControls
                            query={query}
                            onQueryChange={setQuery}
                            searchDisabled={true}
                            sortOrder={sortOrder}
                            onSortChange={setSortOrder}
                            sortDisabled={true}
                            accent={accent}
                        />
                    }
                />
            )
        }

        return (
            <WorkingGrid
                style={containerStyle}
                accent={accent}
                cardStyle={cardStyle}
                state={state}
                displayCourses={displayCourses}
                query={query}
                onQueryChange={setQuery}
                sortOrder={sortOrder}
                onSortChange={setSortOrder}
            />
        )
    })()

    return (
        <>
            {content}
            <DevPill
                accent={accent}
                forcedStatus={forcedStatus}
                effectiveStatus={effectiveStatus}
                onRefresh={reload}
                onForce={setForcedStatus}
            />
        </>
    )
}

CoursesSection.displayName = "Courses Section"

CoursesSection.defaultProps = {
    accentColor: "#4f46e5",
    cardStyle: "filled",
}

// --- Subviews --------------------------------------------------------------

function CanvasPlaceholder({ style, accent, cardStyle }: any) {
    return (
        <div style={{ ...style, boxSizing: "border-box", width: "100%", padding: 24 }}>
            <SectionHeading
                accent={accent}
                title="Courses"
                subtitle="Live data grid — 3 / 2 / 1 columns"
                searchBox={
                    <HeadingControls
                        query=""
                        onQueryChange={() => {}}
                        searchDisabled={true}
                        sortOrder="none"
                        onSortChange={() => {}}
                        sortDisabled={true}
                        accent={accent}
                    />
                }
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

function WorkingGrid({ style, accent, cardStyle, state, displayCourses, query, onQueryChange, sortOrder, onSortChange }: any) {
    const { countryCode } = state
    const trimmed = query.trim()
    const noMatch = state.status === "working" && displayCourses.length === 0 && trimmed !== ""

    return (
        <div style={{ ...style, padding: 24 }}>
            <SectionHeading
                accent={accent}
                title="Courses"
                subtitle={
                    countryCode
                        ? `Showing prices in ${countryCode === "IN" ? "Indian Rupees" : "US Dollars"}`
                        : "Showing both currencies (location unavailable)"
                }
                searchBox={
                    <HeadingControls
                        query={query}
                        onQueryChange={onQueryChange}
                        searchDisabled={false}
                        sortOrder={sortOrder}
                        onSortChange={onSortChange}
                        sortDisabled={false}
                        accent={accent}
                    />
                }
            />
            {noMatch ? (
                <NoMatchState query={query} accent={accent} onClear={() => onQueryChange("")} />
            ) : (
                <ResponsiveGrid>
                    {displayCourses.map((course: Course) => (
                        <CourseCard
                            key={course.courseCode || course.mangoId}
                            course={course}
                            countryCode={countryCode}
                            accent={accent}
                            cardStyle={cardStyle}
                        />
                    ))}
                </ResponsiveGrid>
            )}
        </div>
    )
}

// One field beyond name/description/price, picked for the learner:
// refundable (true/false). A buyer deciding right now cares most about whether
// they can get their money back. mainCategory is also surfaced as a quiet tag
// because it gives the card context at a glance.
function CourseCard({ course, countryCode, accent, cardStyle }: any) {
    const cardBg =
        cardStyle === "filled" ? "#ffffff" :
        cardStyle === "outline" ? "transparent" :
        "#f8fafc"
    const cardBorder =
        cardStyle === "outline" ? `1px solid ${accent}33` :
        cardStyle === "subtle" ? "1px solid #e2e8f0" :
        "1px solid #e2e8f0"
    const cardShadow =
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

function RefundBadge({ accent }: any) {
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

function Tag({ children, accent, soft }: any) {
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

function SectionHeading({ accent, title, subtitle, searchBox }: any) {
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

// 3 / 2 / 1 with a single minmax rule. A 320px floor lands on 3 columns at
// ~1080px, 2 at ~768px, 1 below ~480px. CSS Grid handles uneven card counts
// without leaving gaps — no JS column math, no fixed item count assumed.
function ResponsiveGrid({ children }: any) {
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

function CardShell({ accent, cardStyle, muted, children }: any) {
    const cardBg =
        cardStyle === "filled" ? "#ffffff" :
        cardStyle === "outline" ? "transparent" :
        "#f8fafc"
    const cardBorder =
        cardStyle === "outline" ? `1px solid ${accent}33` :
        "1px solid #e2e8f0"
    return (
        <div style={{
            background: muted ? cardBg : cardBg,
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

function GridSkeleton({ accent, cardStyle }: any) {
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

function StateShell({ style, accent, title, subtitle, searchBox, children }: any) {
    return (
        <div style={{ ...style, padding: 24 }}>
            <SectionHeading accent={accent} title={title} subtitle={subtitle} searchBox={searchBox} />
            {children}
        </div>
    )
}

// Compact ~240px input on desktop; the flex parent wraps it under the
// subtitle on narrow viewports. Disabled until courses have loaded.
function SearchBox({ value, onChange, disabled, accent }: any) {
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

// Groups the search input and sort control so the heading row can lay them
// out together on the right side. Both are independently disabled while the
// courses are loading (or in any non-working state).
function HeadingControls({ query, onQueryChange, searchDisabled, sortOrder, onSortChange, sortDisabled, accent }: any) {
    return (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
            <SortControl
                value={sortOrder}
                onChange={onSortChange}
                disabled={sortDisabled}
                accent={accent}
            />
            <SearchBox
                value={query}
                onChange={onQueryChange}
                disabled={searchDisabled}
                accent={accent}
            />
        </div>
    )
}

// Three-state segmented control: Default (API order) / Price ↑ / Price ↓.
// Sort key is priceUsdCents — every course has it regardless of which
// currency the country endpoint picked, so ordering is stable across a
// currency flip. Disabled while loading.
function SortControl({ value, onChange, disabled, accent }: any) {
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

// Shown only when courses are loaded but the current query matches nothing.
// Distinct from the API-returned-empty state: the catalog is fine, the
// filter is just too narrow. Search box stays enabled so the user can refine.
function NoMatchState({ query, accent, onClear }: any) {
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

function RetryButton({ accent, onClick }: any) {
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

// --- DevPill ---------------------------------------------------------------
// Developer-only floating overlay for inspecting each state without waiting
// for the flaky API to oblige. Rendered via React Portal at document.body so
// it escapes any parent stacking context. Shown in Framer preview only —
// never on canvas, never in export/thumbnail. Refresh refetches both
// endpoints for real; the four small buttons force a status for preview.

const DEV_STATES: { key: Status; label: string }[] = [
    { key: "loading", label: "Load" },
    { key: "error", label: "Error" },
    { key: "empty", label: "Zero" },
    { key: "working", label: "Default" },
]

function DevPill({ accent, forcedStatus, effectiveStatus, onRefresh, onForce }: any) {
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

// --- Property controls -----------------------------------------------------
// Two controls a designer would actually reach for:
//  1. accentColor — the brand colour used for headings, price, tags, buttons.
//  2. cardStyle — fills vs outlines vs subtle tint. A pure visual switch.
addPropertyControls(CoursesSection, {
    accentColor: {
        type: ControlType.Color,
        title: "Accent color",
        defaultValue: "#4f46e5",
        description: "Brand colour applied to the heading, price, tags, and CTA.",
    },
    cardStyle: {
        type: ControlType.Enum,
        title: "Card style",
        options: ["filled", "outline", "subtle"],
        optionTitles: ["Filled", "Outline", "Subtle"],
        defaultValue: "filled",
        displaySegmentedControl: true,
        description: "Visual treatment of the course cards.",
    },
})