import type { StorageStrategy } from "../types"

/**
 * Multi File storage strategy
 * Stores each key in a separate file
 * @requires node:fs/promises and path (Node.js environment)
 */
export class MultiFileStrategy implements StorageStrategy {
	public isSync = false
	private directory: string

	constructor(directory: string) {
		this.directory = directory

		try {
			// Check if we're in a Node.js environment with node:fs/promises and path available
			require("node:fs/promises")
			require("node:path")
		} catch (error) {
			throw new Error(
				"Node.js modules (node:fs/promises, path) not available"
			)
		}
	}

	private async ensureDirectoryExists(): Promise<void> {
		try {
			const fs = require("node:fs/promises")
			await fs.mkdir(this.directory, { recursive: true })
		} catch (error) {
			console.error("Error ensuring directory exists:", error)
			throw error
		}
	}

	private getFilePath(key: string): string {
		try {
			const path = require("node:path")
			// Sanitize the key to make it safe for filenames
			const safeKey = key.replace(/[/\\?%*:|"<>]/g, "_")
			return path.join(this.directory, `${safeKey}.json`)
		} catch (error) {
			throw new Error("Path module not available")
		}
	}

	async has(key: string): Promise<boolean> {
		try {
			const fs = require("node:fs/promises")
			await this.ensureDirectoryExists()
			const filePath = this.getFilePath(key)

			try {
				await fs.access(filePath)
				return true
			} catch {
				return false
			}
		} catch (error) {
			console.error("MultiFile has error:", error)
			return false
		}
	}

	async get(key: string): Promise<string | null> {
		try {
			const fs = require("node:fs/promises")
			await this.ensureDirectoryExists()
			const filePath = this.getFilePath(key)

			try {
				await fs.access(filePath)
			} catch {
				return null // File doesn't exist
			}

			try {
				const data = await fs.readFile(filePath, "utf8")
				return data
			} catch (error) {
				console.error("Error reading file:", error)
				return null
			}
		} catch (error) {
			console.error("MultiFile get error:", error)
			return null
		}
	}

	async set(key: string, value: string): Promise<void> {
		try {
			const fs = require("node:fs/promises")
			await this.ensureDirectoryExists()
			const filePath = this.getFilePath(key)
			await fs.writeFile(filePath, value)
		} catch (error) {
			console.error("MultiFile set error:", error)
		}
	}

	async remove(key: string): Promise<void> {
		try {
			const fs = require("node:fs/promises")
			const filePath = this.getFilePath(key)

			try {
				await fs.access(filePath)
				await fs.unlink(filePath)
			} catch {
				// File doesn't exist, nothing to do
			}
		} catch (error) {
			console.error("MultiFile remove error:", error)
		}
	}
}
