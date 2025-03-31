import type { MergeStrategy } from "../types"

/**
 * Default merge strategy that replaces initial state with rehydrated state
 */
export class DefaultMergeStrategy<T> implements MergeStrategy<T> {
	merge(initialState: T, rehydratedState: T): T {
		return { ...initialState, ...rehydratedState }
	}
}
