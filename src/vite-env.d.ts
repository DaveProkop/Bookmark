/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface BarcodeDetectorOptions { formats?: string[] }
interface Barcode { rawValue: string; format: string }
declare class BarcodeDetector {
  constructor(options?: BarcodeDetectorOptions)
  detect(source: HTMLVideoElement | HTMLImageElement | ImageBitmap): Promise<Barcode[]>
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string
  readonly VITE_APP_VERSION: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
