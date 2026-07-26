<template>
  <div class="empty">
    <div class="empty-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6">
        <path d="M4 19V7m5 12V4m5 15v-8m5 8V9" stroke-linecap="round" />
      </svg>
    </div>
    <p class="empty-title">{{ title }}</p>
    <p v-if="text" class="empty-text">{{ text }}</p>
    <button v-if="action" class="btn btn-primary btn-sm" type="button" @click="$emit('action')">
      {{ action }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  text: { type: String, default: '' },
  action: { type: String, default: '' }
})
defineEmits(['action'])
</script>
