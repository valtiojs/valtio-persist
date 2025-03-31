export interface HistoryEntry<T> {
	timestamp: number
	action: string
	previousState: Partial<T>
	currentState: Partial<T>
	path?: string[]
}

export interface HistoryOptions<H> {
	enabled?: boolean
	maxEntries: number
	trackPaths?: string[] | boolean
	exportOptions?: {
		autoExport?: boolean
		exportInterval?: number
		exportTarget?: "file" | "api" | "console"
		exportPath?: string
		exportUrl?: string
		exportFormat?: "json" | "csv" | "custom"
		exportTransformer?: (history: Array<HistoryEntry<H>>) => unknown
	}
}

// WeakMap to store history without affecting serialization
export const stateHistory = new WeakMap<object, Array<HistoryEntry<unknown>>>()

/**
 * Initialize history tracking for a state object
 */
export function initHistory<T extends object>(
	state: T,
	options: HistoryOptions<T>,
): void {
	// Initialize empty history if not exists
	if (!stateHistory.has(state)) {
		stateHistory.set(state, [])
	}

	// Set up auto-export if configured
	if (
		options.exportOptions?.autoExport &&
		options.exportOptions.exportInterval
	) {
		const interval = options.exportOptions.exportInterval

		setInterval(() => {
			exportHistory(state, options)
		}, interval)
	}
}

/**
 * Create and add a history entry for a state change
 */
export function createHistoryEntry<T extends object>(
	state: T,
	path: string[],
	previousValue: unknown,
	newValue: unknown,
	options: HistoryOptions<T>,
	actionType = "update",
): void {
	if (options.enabled === false) return

	// Check if we should track this path
	if (options.trackPaths !== undefined) {
		const shouldTrack =
			typeof options.trackPaths === "boolean"
				? options.trackPaths
				: path.some((_segment) => {
						return (
							Array.isArray(options.trackPaths) &&
							options.trackPaths!.some((trackedPath: string) => {
								// Check if the current path matches or is a child of a tracked path
								const trackedSegments =
									typeof trackedPath === "string"
										? trackedPath.split(".")
										: trackedPath

								const minLength = Math.min(trackedSegments.length, path.length)
								for (let i = 0; i < minLength; i++) {
									if (trackedSegments[i] !== path[i]) return false
								}
								return true
							})
						)
					})

		if (!shouldTrack) return
	}

	const history = stateHistory.get(state) || []

	const entry: HistoryEntry<T> = {
		timestamp: Date.now(),
		action: actionType,
		previousState: path.length
			? createNestedObject<T>(path, previousValue)
			: (previousValue as Partial<T>),
		currentState: path.length
			? createNestedObject<T>(path, newValue)
			: (newValue as Partial<T>),
		path: path.length ? path : undefined,
	}

	history.push(entry)

	// Maintain size limit
	if (options.maxEntries && history.length > options.maxEntries) {
		history.splice(0, history.length - options.maxEntries)
	}

	stateHistory.set(state, history as Array<HistoryEntry<unknown>>)
}

/**
 * Export history based on the configured options
 */
export function exportHistory<T extends object>(
	state: T,
	options: HistoryOptions<T>,
): void {
	if (!options.exportOptions) return

	const history = stateHistory.get(state) || []

	// Apply transformer if provided
	const data = options.exportOptions.exportTransformer
		? options.exportOptions.exportTransformer(history as Array<HistoryEntry<T>>)
		: history

	// Format data based on specified format
	let formattedData: string
	switch (options.exportOptions.exportFormat) {
		case "csv":
			formattedData = convertToCSV(data as unknown[])
			break
		case "custom":
			// Custom format should be handled by the transformer
			formattedData = typeof data === "string" ? data : JSON.stringify(data)
			break
		default:
			formattedData = JSON.stringify(data, null, 2)
	}

	// Export to target
	switch (options.exportOptions.exportTarget) {
		case "file":
			if (typeof window !== "undefined" && options.exportOptions.exportPath) {
				// Browser environment - trigger download
				downloadFile(formattedData, options.exportOptions.exportPath)
			} else if (typeof require === "function") {
				// Node environment - write to file
				try {
					const fs = require("node:fs")
					const path = require("node:path")
					const filePath = path.resolve(
						options.exportOptions.exportPath || "./valtio-history.json",
					)
					fs.writeFileSync(filePath, formattedData)
				} catch (error) {
					console.error("Failed to write history to file:", error)
				}
			}
			break

		case "api":
			if (options.exportOptions.exportUrl) {
				fetch(options.exportOptions.exportUrl, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: formattedData,
				}).catch((error) => {
					console.error("Failed to export history to API:", error)
				})
			}
			break

		default:
			console.log("[Valtio History]", data)
	}
}

/**
 * Get history for a state object
 */
export function getHistory<T extends object>(state: T): Array<HistoryEntry<T>> {
	return (stateHistory.get(state) || []) as Array<HistoryEntry<T>>
}

/**
 * Clear history for a state object
 */
export function clearHistory<T extends object>(state: T): void {
	stateHistory.set(state, [])
}

// Helper functions

/**
 * Create a nested object from a path and value
 */
function createNestedObject<T>(path: string[], value: unknown): Partial<T> {
	const result = {} as Record<string, unknown>
	let current = result

	// Build the nested structure
	for (let i = 0; i < path.length - 1; i++) {
		current[path[i]] = {}
		current = current[path[i]] as Record<string, unknown>
	}

	// Set the value at the final path
	if (path.length > 0) {
		current[path[path.length - 1]] = value
	}

	return result as Partial<T>
}

/**
 * Convert data to CSV format
 */
function convertToCSV(data: unknown[]): string {
	if (!data.length) return ""

	// Ensure the first item is treated as a record object
	const firstItem = data[0] as Record<string, unknown>

	// Get headers from the first item
	const headers = Object.keys(firstItem)

	// Create CSV header row
	const headerRow = headers.join(",")

	// Create data rows
	const rows = data.map((item) => {
		return headers
			.map((header) => {
				const value = (item as Record<string, unknown>)[header]
				// Handle different types of values
				if (typeof value === "object" && value !== null) {
					return `"${JSON.stringify(value).replace(/"/g, '""')}"`
				}
				return `"${String(value).replace(/"/g, '""')}"`
			})
			.join(",")
	})

	// Combine header and rows
	return [headerRow, ...rows].join("\n")
}

/**
 * Download a file in the browser
 */
function downloadFile(content: string, filename: string): void {
	const blob = new Blob([content], { type: "text/plain" })
	const url = URL.createObjectURL(blob)
	const a = document.createElement("a")
	a.href = url
	a.download = filename
	document.body.appendChild(a)
	a.click()
	document.body.removeChild(a)
	URL.revokeObjectURL(url)
}
