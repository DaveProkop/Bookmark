<script setup lang="ts">
import { StarIcon } from '@heroicons/vue/24/solid'
import { StarIcon as StarOutline } from '@heroicons/vue/24/outline'

const props = defineProps<{ modelValue: number | null; readonly?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [v: number | null] }>()

function setRating(v: number) {
  if (props.readonly) return
  emit('update:modelValue', props.modelValue === v ? null : v)
}
</script>

<template>
  <div class="flex gap-1">
    <button
      v-for="n in 5"
      :key="n"
      @click="setRating(n)"
      :disabled="readonly"
      class="transition-transform active:scale-110"
    >
      <StarIcon v-if="modelValue && n <= modelValue" class="w-6 h-6 text-brand-500" />
      <StarOutline v-else class="w-6 h-6 text-gray-300" />
    </button>
  </div>
</template>
