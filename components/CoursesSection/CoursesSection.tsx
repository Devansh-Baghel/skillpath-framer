// CoursesSection — top-level shell. The only file a non-coder drops on the
// canvas. Owns all state + orchestration; imports presentational pieces
// from sibling folders. No feature/UI change from the previous single-file
// version — this is a pure restructure.

import { useEffect, useMemo, useState } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

import { tok } from "./api/types.ts"
import type { CardStyle, FetchedState, SortOrder, Status } from "./api/types.ts"
import { loadAll } from "./api/coursesApi.ts"
import { CourseCard } from "./cards/CourseCard.tsx"
import { HeadingControls } from "./controls/HeadingControls.tsx"
import { SectionHeading } from "./layout/SectionHeading.tsx"
import { ResponsiveGrid, GridSkeleton } from "./grid/CourseGrid.tsx"
import { StateShell, NoMatchState, RetryButton, CanvasPlaceholder } from "./states/States.tsx"
import { DevPill } from "./dev/DevPill.tsx"

/**
 * @framerDisableUnlink
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight auto
 * @framerIntrinsicWidth 1080
 * @framerIntrinsicHeight 720
 */
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

    // Disabled heading controls for non-working states — rendered so the
    // layout is represented while loading / in error / in empty.
    const disabledHeadingControls = (
        <HeadingControls
            query={query}
            onQueryChange={setQuery}
            searchDisabled={true}
            sortOrder={sortOrder}
            onSortChange={setSortOrder}
            sortDisabled={true}
            accent={accent}
        />
    )

    // Canvas placeholder — never fetches, always deterministic.
    if (!isClient || RenderTarget.current() === RenderTarget.canvas) {
        return (
            <CanvasPlaceholder
                style={style}
                accent={accent}
                cardStyle={cardStyle}
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
        )
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
                    searchBox={disabledHeadingControls}
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
                    searchBox={disabledHeadingControls}
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
                    searchBox={disabledHeadingControls}
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

// Kept inline in the shell — it's thin orchestration that reads shell-level
// state (displayCourses, query, sortOrder) and decides no-match vs grid.
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
                    {displayCourses.map((course: any) => (
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

CoursesSection.displayName = "Courses Section"

CoursesSection.defaultProps = {
    accentColor: "#4f46e5",
    cardStyle: "filled",
}

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