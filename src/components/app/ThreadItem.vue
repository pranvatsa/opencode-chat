<script setup lang="ts">
import { nextTick, ref } from "vue"
import { MoreHorizontal, Pencil, Trash2 } from "@/components/icons"
import type { Thread } from "@shared/types"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const props = defineProps<{ thread: Thread; active: boolean }>()
const emit = defineEmits<{ select: []; rename: [title: string]; remove: [] }>()

const editing = ref(false)
const draft = ref("")
const field = ref<HTMLInputElement | null>(null)

async function startRename() {
  draft.value = props.thread.title
  editing.value = true
  await nextTick()
  field.value?.focus()
  field.value?.select()
}

function commitRename() {
  if (!editing.value) return
  editing.value = false
  emit("rename", draft.value)
}
</script>

<template>
  <div class="group relative">
    <input
      v-if="editing"
      ref="field"
      v-model="draft"
      type="text"
      aria-label="Chat title"
      class="h-8 w-full rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
      @keydown.enter.prevent="commitRename"
      @keydown.esc.prevent="editing = false"
      @blur="commitRename"
    />

    <template v-else>
      <button
        type="button"
        class="relative flex h-8 w-full items-center gap-2 rounded-md pr-8 pl-3 text-left text-sm hover:bg-sidebar-accent"
        :class="active && 'bg-sidebar-accent font-medium'"
        :aria-current="active ? 'page' : undefined"
        @click="emit('select')"
      >
        <span
          v-if="active"
          aria-hidden="true"
          class="absolute top-1/2 left-0.5 h-4 w-0.5 -translate-y-1/2 rounded-full bg-brand"
        />
        <span class="truncate">{{ thread.title }}</span>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button
            variant="ghost"
            size="icon-xs"
            class="absolute top-1/2 right-1 -translate-y-1/2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
            :aria-label="`Actions for ${thread.title}`"
            @click.stop
          >
            <MoreHorizontal class="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-40">
          <DropdownMenuItem @select="startRename">
            <Pencil class="size-3.5" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem class="text-destructive" @select="emit('remove')">
            <Trash2 class="size-3.5" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </template>
  </div>
</template>
