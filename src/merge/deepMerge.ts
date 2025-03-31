import type { MergeStrategy } from "../types"
import { deepClone } from "valtio/utils"

/**
 * Deep merge strategy that recursively merges objects
 */
export class DeepMergeStrategy<T> implements MergeStrategy<T> {
	// Convert to arrow function to ensure proper 'this' binding
	merge = (initialState: T, rehydratedState: T): T => {
		return this.deepMerge(initialState, rehydratedState) as T
	}

	// Convert private method to arrow function as well
	private deepMerge = (target: unknown, source: unknown): unknown => {
		if (typeof source !== "object" || source === null) {
			return source
		}

		if (typeof target !== "object" || target === null) {
			return deepClone(source)
		}

		if (Array.isArray(source)) {
			if (!Array.isArray(target)) {
				return deepClone(source)
			}

			return [...source]
		}

		const result: Record<string, unknown> = { ...target }

		for (const key in source) {
			if (Object.prototype.hasOwnProperty.call(source, key)) {
				const sourceValue = (source as Record<string, unknown>)[key]
				const targetValue = (target as Record<string, unknown>)[key]

				result[key] = this.deepMerge(targetValue, sourceValue)
			}
		}

		return result
	}
}
