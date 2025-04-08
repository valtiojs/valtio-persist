import type { MergeStrategy } from "../types"

/**
 * Default merge strategy that replaces initial state with restored state
 */
export class DefaultMergeStrategy<T> implements MergeStrategy<T, false> {
	isAsync = false as const

	merge(initialState: T, restoredState: T): T {
		return { ...initialState, ...restoredState }
	}
}
