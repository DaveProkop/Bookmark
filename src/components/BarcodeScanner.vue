<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

const emit = defineEmits<{ detected: [isbn: string] }>()
const { t } = useI18n()

const videoRef = ref<HTMLVideoElement>()
const error = ref<string | null>(null)
const scanning = ref(false)

let stream: MediaStream | null = null
let detector: BarcodeDetector | null = null
let rafId: number

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
    })
    if (!videoRef.value) return
    videoRef.value.srcObject = stream
    await videoRef.value.play()
    scanning.value = true
    rafId = requestAnimationFrame(scanLoop)
  } catch (e) {
    error.value = t('scanner.cameraError')
  }
}

async function scanLoop() {
  if (!videoRef.value || !detector || videoRef.value.readyState < 2) {
    rafId = requestAnimationFrame(scanLoop)
    return
  }
  try {
    const barcodes = await detector.detect(videoRef.value)
    const hit = barcodes.find(b => ['ean_13', 'ean_8', 'upc_a', 'upc_e'].includes(b.format))
    if (hit) {
      stopCamera()
      emit('detected', hit.rawValue)
      return
    }
  } catch {}
  rafId = requestAnimationFrame(scanLoop)
}

function stopCamera() {
  cancelAnimationFrame(rafId)
  stream?.getTracks().forEach(t => t.stop())
  scanning.value = false
}

onMounted(async () => {
  if (!('BarcodeDetector' in window)) {
    error.value = t('scanner.unsupported')
    return
  }
  detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] })
  await startCamera()
})

onUnmounted(stopCamera)
</script>

<template>
  <div class="relative w-full h-full bg-black flex items-center justify-center">
    <video ref="videoRef" class="w-full h-full object-cover" playsinline muted />

    <div v-if="scanning" class="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div class="w-64 h-40 relative">
        <div class="absolute inset-0 border-2 border-brand-500 rounded-xl opacity-80" />
        <div class="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-brand-400 rounded-tl-lg" />
        <div class="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-brand-400 rounded-tr-lg" />
        <div class="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-brand-400 rounded-bl-lg" />
        <div class="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-brand-400 rounded-br-lg" />
        <div class="absolute inset-x-0 top-1/2 h-0.5 bg-brand-500 opacity-60 animate-pulse" />
      </div>
      <p class="absolute bottom-24 text-white text-sm text-center px-6 opacity-80">
        {{ t('scanner.hint') }}
      </p>
    </div>

    <div v-if="error" class="absolute inset-0 flex items-center justify-center bg-black/80 p-8">
      <div class="bg-white rounded-2xl p-6 text-center">
        <p class="text-2xl mb-3">📵</p>
        <p class="text-gray-700 font-medium">{{ error }}</p>
      </div>
    </div>
  </div>
</template>
