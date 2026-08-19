// Groups the search input and sort control so the heading row can lay them
// out together on the right side. Both are independently disabled while the
// courses are loading (or in any non-working state).
import { SearchBox } from "./SearchBox.tsx"
import { SortControl } from "./SortControl.tsx"

export function HeadingControls({
    query,
    onQueryChange,
    searchDisabled,
    sortOrder,
    onSortChange,
    sortDisabled,
    accent,
}: any) {
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