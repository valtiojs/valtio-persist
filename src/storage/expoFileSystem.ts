import type { StorageStrategy } from "../types"

/**
 * Expo FileSystem storage strategy
 * @requires expo-file-system
 */
export class ExpoFileSystemStrategy implements StorageStrategy {
  public isSync = false
  private baseDirectory: string
  
  constructor(baseDirectory?: string) {
    try {
      // Test if the package is available
      require('expo-file-system')
      
      // If not specified, we'll use a subdirectory in the app's document directory
      this.baseDirectory = baseDirectory || 'valtio-persist/'
    } catch (e) {
      throw new Error('Package expo-file-system not found. Please install it first.')
    }
  }

  private getFilePath(key: string): string {
    try {
      const FileSystem = require('expo-file-system')
      // Ensure the key is valid for a file name by replacing invalid characters
      const safeKey = key.replace(/[/\\?%*:|"<>]/g, '_')
      return `${FileSystem.documentDirectory}${this.baseDirectory}${safeKey}.json`
    } catch (error) {
      throw new Error('expo-file-system not available')
    }
  }

  private async ensureDirectoryExists(): Promise<void> {
    try {
      const FileSystem = require('expo-file-system')
      const dirPath = `${FileSystem.documentDirectory}${this.baseDirectory}`
      
      // Check if directory exists, create if not
      try {
        const dirInfo = await FileSystem.getInfoAsync(dirPath)
        
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true })
        }
      } catch (error) {
        console.error("Error ensuring directory exists:", error)
        // Try to create the directory anyway
        try {
          await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true })
        } catch (err) {
          console.error("Failed to create directory:", err)
          throw err
        }
      }
    } catch (error) {
      throw new Error('expo-file-system not available')
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const FileSystem = require('expo-file-system')
      await this.ensureDirectoryExists()
      const filePath = this.getFilePath(key)
      
      const fileInfo = await FileSystem.getInfoAsync(filePath)
      return fileInfo.exists === true
    } catch (error) {
      console.error("ExpoFileSystem has error:", error)
      return false
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      const FileSystem = require('expo-file-system')
      await this.ensureDirectoryExists()
      const filePath = this.getFilePath(key)
      
      // Check if file exists before reading
      const fileInfo = await FileSystem.getInfoAsync(filePath)
      
      if (!fileInfo.exists) {
        return null
      }
      
      const content = await FileSystem.readAsStringAsync(filePath)
      return content
    } catch (error) {
      console.error("ExpoFileSystem get error:", error)
      return null
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      const FileSystem = require('expo-file-system')
      await this.ensureDirectoryExists()
      const filePath = this.getFilePath(key)
      await FileSystem.writeAsStringAsync(filePath, value)
    } catch (error) {
      console.error("ExpoFileSystem set error:", error)
    }
  }

  async remove(key: string): Promise<void> {
    try {
      const FileSystem = require('expo-file-system')
      const filePath = this.getFilePath(key)
      
      // Check if file exists before attempting to delete
      const fileInfo = await FileSystem.getInfoAsync(filePath)
      
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(filePath)
      }
    } catch (error) {
      console.error("ExpoFileSystem remove error:", error)
    }
  }
}