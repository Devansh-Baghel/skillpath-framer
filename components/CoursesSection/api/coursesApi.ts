// API fetching for the Courses Section. No React here — pure async functions
// + price formatters. Imported by the shell component.
import type { Course, CountryCode, FetchedState } from "./types.ts"

const API_BASE = "https://syncsphere-hiv6.onrender.com"
const COURSES_PATH = "/assignment/course-data"
const COUNTRY_PATH = "/assignment/country-code"

// The API fails on purpose ~1/3 of the time (404/500). Retry a few times
// before giving up — most loads resolve on the 2nd or 3rd hit.
const MAX_ATTEMPTS = 4

// --- Price formatting ------------------------------------------------------
// Units matter. pricePaise is paise (100 paise = 1 rupee), priceUsdCents is
// cents (100 cents = 1 dollar). Don't render the raw number.
export const formatInr = (paise: number): string =>
    "₹" + (paise / 100).toLocaleString("en-IN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    })

export const formatUsd = (cents: number): string =>
    "$" + (cents / 100).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })

// When the country call fails, we don't know which currency to show. Showing
// nothing is wrong; showing both is honest. The learner can tell which one
// applies to them.
export const formatPrice = (course: Course, country: CountryCode | null): string => {
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
export async function loadAll(): Promise<FetchedState> {
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