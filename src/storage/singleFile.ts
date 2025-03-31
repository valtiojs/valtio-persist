import type { StorageStrategy } from "../types"

/**
 * Single File storage strategy
 * Stores all state in a single file using filesystem APIs
 * @requires fs/promises and path (Node.js environment)
 */
export class SingleFileStrategy implements StorageStrategy {
	public isSync = false
	private filePath: string
	private cache: Map<string, string> = new Map()
	private initialized = false

	constructor(filePath: string) {
		this.filePath = filePath

		try {
			// Check if we're in a Node.js environment with fs/promises and path available
			require("node:fs/promises")
			require("node:path")
		} catch (error) {
			throw new Error(
				"Node.js modules (fs/promises, path) not available. This strategy only works in Node.js environments.",
			)
		}
	}

	private async ensureFileExists(): Promise<void> {
		try {
			const fs = require("node:fs/promises")
			const path = require("node:path")

			// Check if the directory exists, create if not
			const directory = path.dirname(this.filePath)
			await fs.mkdir(directory, { recursive: true })

			// Check if the file exists, create if not
			try {
				await fs.access(this.filePath)
			} catch {
				// File doesn't exist, create it with an empty object
				await fs.writeFile(this.filePath, JSON.stringify({}))
			}
		} catch (error) {
			console.error("Error ensuring file exists:", error)
			throw error
		}
	}

	private async loadFromFile(): Promise<void> {
		if (this.initialized) return

		try {
			const fs = require("node:fs/promises")
			await this.ensureFileExists()

			try {
				const data = await fs.readFile(this.filePath, "utf8")

				if (!data) {
					this.cache = new Map()
				} else {
					try {
						const json = JSON.parse(data)
						this.cache = new Map(Object.entries(json))
					} catch {
						this.cache = new Map()
					}
				}
			} catch (error) {
				console.error("Error reading from file:", error)
				this.cache = new Map()
			}

			this.initialized = true
		} catch (error) {
			console.error("Error loading from file:", error)
			this.cache = new Map()
			this.initialized = true
		}
	}

	private async saveToFile(): Promise<void> {
		try {
			const fs = require("node:fs/promises")
			const obj = Object.fromEntries(this.cache.entries())
			await fs.writeFile(this.filePath, JSON.stringify(obj, null, 2))
		} catch (error) {
			console.error("Error saving to file:", error)
		}
	}

	async has(key: string): Promise<boolean> {
		try {
			await this.loadFromFile()
			return this.cache.has(key)
		} catch (error) {
			console.error("SingleFile has error:", error)
			return false
		}
	}

	async get(key: string): Promise<string | null> {
		try {
			await this.loadFromFile()
			return this.cache.get(key) || null
		} catch (error) {
			console.error("SingleFile get error:", error)
			return null
		}
	}

	async set(key: string, value: string): Promise<void> {
		try {
			await this.loadFromFile()
			this.cache.set(key, value)
			await this.saveToFile()
		} catch (error) {
			console.error("SingleFile set error:", error)
		}
	}

	async remove(key: string): Promise<void> {
		try {
			await this.loadFromFile()
			this.cache.delete(key)
			await this.saveToFile()
		} catch (error) {
			console.error("SingleFile remove error:", error)
		}
	}
}
