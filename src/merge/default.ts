import type { MergeStrategy } from "../types"

/**
 * Default merge strategy that replaces initial state with restored state
 */
export class DefaultMergeStrategy<T extends object> implements MergeStrategy<T, false> {
	isAsync = false as const

	merge(initialState: T, restoredState: T): T {
		const merged = { ...initialState, ...restoredState } as T

		const canonicalProto = Object.getPrototypeOf(initialState)
		if (canonicalProto !== null && Object.getPrototypeOf(merged) !== canonicalProto) {
			Object.setPrototypeOf(merged, canonicalProto)
		}

		return merged
	}
}