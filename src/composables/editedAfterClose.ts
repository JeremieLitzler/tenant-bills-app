// The cells written after their period was closed (a patch queued before the close, applied after
// it), as `patchKey`s. In memory: the flag is lost on a reload.
import { reactive } from 'vue'

export const editedAfterClose = reactive(new Set<string>())
