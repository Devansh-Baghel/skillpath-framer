// Shared types + helpers for the Courses Section. No React, no fetch —
// pure data shapes so any module can import without pulling in side effects.

export interface Course {
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

export type CountryCode = "IN" | "US"

export type Status = "loading" | "error" | "empty" | "working"

export type SortOrder = "none" | "asc" | "desc"

export type CardStyle = "filled" | "outline" | "subtle"

export interface FetchedState {
    status: Status
    courses: Course[]
    countryCode: CountryCode | null // null when country call failed but courses worked
    error?: string
}

// Unwrap a ControlType.Color value that may arrive as { value: "#xxx" } when
// the user binds a Framer color token, or as a plain string otherwise.
export const tok = (v: any): string =>
    v && typeof v === "object" && "value" in v ? v.value : v