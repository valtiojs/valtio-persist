import type { StorageStrategy } from "../types"

// Add types for FileSystem API if not already available
declare global {
	interface StorageManager {
		getDirectory(): Promise<FileSystemDirectoryHandle>
	}
}

/**
 * FileSystem API strategy for Progressive Web Apps
 * Uses the modern File System Access API available in modern browsers
 */
export class FileSystemApiStrategy implements StorageStrategy {
	public isSync = false
	private rootDir: FileSystemDirectoryHandle | null = null
	private initialized = false
	private directoryName: string

	constructor(directoryName = "valtio-persist-data") {
		this.directoryName = directoryName
		
		// Check if running in a browser environment
		if (typeof window === 'undefined' || typeof navigator === 'undefined') {
			throw new Error("FileSystem API is only available in browser environments")
		}
	}

	private async initialize(): Promise<void> {
		if (this.initialized) return

		try {
			// Check if the FileSystem API is available
			if (
				!("navigator" in globalThis) ||
				!navigator.storage ||
				!("getDirectory" in navigator.storage)
			) {
				throw new Error("FileSystem API is not available in this environment")
			}

			// Get the root directory from the storage foundation API
			const root = await navigator.storage.getDirectory()

			// Try to get our app directory, create if it doesn't exist
			try {
				this.rootDir = await root.getDirectoryHandle(this.directoryName, {
					create: true,
				})
			} catch (error) {
				console.error("Error getting/creating directory:", error)
				throw error
			}

			this.initialized = true
		} catch (error) {
			console.error("Error initializing FileSystem API:", error)
			throw error
		}
	}

	private async getFileHandle(
		key: string,
		create = false,
	): Promise<FileSystemFileHandle | null> {
		if (!this.rootDir) {
			await this.initialize()
		}

		if (!this.rootDir) {
			return null
		}

		// Sanitize the key to be a valid filename
		const safeKey = `${key.replace(/[/\\?%*:|"<>]/g, "_")}.json`

		try {
			return await this.rootDir.getFileHandle(safeKey, { create })
		} catch (error) {
			if (create) {
				console.error(`Error creating file for key ${key}:`, error)
			}
			return null
		}
	}

	async has(key: string): Promise<boolean> {
		try {
			await this.initialize()

			if (!this.rootDir) {
				return false
			}

			const fileHandle = await this.getFileHandle(key, false)
			return fileHandle !== null
		} catch (error) {
			console.error("FileSystemAPI has error:", error)
			return false
		}
	}

	async get(key: string): Promise<string | null> {
		try {
			await this.initialize()

			if (!this.rootDir) {
				return null
			}

			const fileHandle = await this.getFileHandle(key, false)

			if (!fileHandle) {
				return null
			}

			// Get a file object from the handle
			const file = await fileHandle.getFile()

			// Read the file as text
			return await file.text()
		} catch (error) {
			console.error("FileSystemAPI get error:", error)
			return null
		}
	}

	async set(key: string, value: string): Promise<void> {
		try {
			await this.initialize()

			if (!this.rootDir) {
				return
			}

			const fileHandle = await this.getFileHandle(key, true)

			if (!fileHandle) {
				throw new Error(`Could not create file for key: ${key}`)
			}

			// Create a writable stream and write the data
			const writable = await fileHandle.createWritable()
			await writable.write(value)
			await writable.close()
		} catch (error) {
			console.error("FileSystemAPI set error:", error)
		}
	}

	async remove(key: string): Promise<void> {
		try {
			await this.initialize()

			if (!this.rootDir) {
				return
			}

			// Sanitize the key to be a valid filename
			const safeKey = `${key.replace(/[/\\?%*:|"<>]/g, "_")}.json`

			try {
				await this.rootDir.removeEntry(safeKey)
			} catch (error) {
				// Ignore errors if the file doesn't exist
				if (
					!(error instanceof DOMException && error.name === "NotFoundError")
				) {
					console.error(`Error removing file for key ${key}:`, error)
				}
			}
		} catch (error) {
			console.error("FileSystemAPI remove error:", error)
		}
	}
}
