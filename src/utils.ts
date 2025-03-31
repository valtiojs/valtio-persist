/**
 * Railway error handlilng
 */
type Success<T> = {
	data: T
	error: null
}

type Failure<E> = {
	data: null
	error: E
}

type Result<T, E = Error> = Success<T> | Failure<E>

export async function attempt<T, E = Error>(
	promise: Promise<T>,
): Promise<Result<T, E>> {
	try {
		const data = await promise
		return { data, error: null }
	} catch (error) {
		return { data: null, error: error as E }
	}
}

/**
 * Improved debounce function that handles promises correctly
 */
export function debounce<
	T extends (...args: unknown[]) => Promise<unknown> | unknown,
>(fn: T, ms = 0): (...args: Parameters<T>) => Promise<ReturnType<T>> {
	let timeoutId: ReturnType<typeof setTimeout> | null = null

	return function (
		this: unknown,
		...args: Parameters<T>
	): Promise<ReturnType<T>> {
		return new Promise((resolve) => {
			if (timeoutId !== null) {
				clearTimeout(timeoutId)
			}

			timeoutId = setTimeout(() => {
				const result = fn.apply(this, args) as ReturnType<T>
				if (result instanceof Promise) {
					// Handle async functions by waiting for their promises to resolve
					;(result as Promise<unknown>).then(() => {
						resolve(result as ReturnType<T>)
					})
				} else {
					// Handle synchronous functions
					resolve(result as ReturnType<T>)
				}
				timeoutId = null
			}, ms)
		})
	}
}

// Function to safely update the store without breaking the proxy
export const updateStore = <T extends object>(store: T, newState: T) => {
	for (const key of Object.keys(newState)) {
		store[key as keyof T] = newState[key as keyof T]
	}
}
