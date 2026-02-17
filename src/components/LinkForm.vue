<script setup>
import { ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { getAllSelectablePaths } from '../utils/categoryTree.js'

const props = defineProps({
  link: { type: Object, default: null },
  categories: { type: Array, default: () => [] },
  selectablePaths: { type: Array, default: () => [] }
})

const emit = defineEmits(['save', 'close', 'ensure-category'])

const form = ref({
  url: '',
  title: '',
  category: '默认',
  description: ''
})

const DEFAULT = '默认'

const categoryOptions = computed(() => {
  const paths = props.selectablePaths && props.selectablePaths.length
    ? props.selectablePaths
    : getAllSelectablePaths(props.categories)
  return paths.map(p => ({ label: p.path, value: p.path }))
})

watch(() => props.link, (link) => {
  if (link) {
    form.value = {
      url: link.url || '',
      title: link.title || '',
      category: link.category || DEFAULT,
      description: link.description || ''
    }
  } else {
    form.value = {
      url: '',
      title: '',
      category: DEFAULT,
      description: ''
    }
  }
}, { immediate: true })

function submit() {
  const url = form.value.url.trim()
  if (!url) {
    ElMessage.warning('请输入 URL')
    return
  }
  const title = form.value.title.trim() || url
  emit('ensure-category', form.value.category)
  emit('save', {
    ...(props.link ? { id: props.link.id } : {}),
    url,
    title,
    category: form.value.category || DEFAULT,
    description: form.value.description.trim() || title
  })
}
</script>

<template>
  <el-dialog
    :model-value="true"
    :title="link ? '编辑链接' : '新增链接'"
    width="480px"
    :close-on-click-modal="true"
    @close="emit('close')"
    @update:model-value="(val) => !val && emit('close')"
  >
    <el-form label-position="top">
      <el-form-item label="URL" required>
        <el-input
          v-model="form.url"
          placeholder="https://..."
          clearable
        />
      </el-form-item>
      <el-form-item label="标题">
        <el-input
          v-model="form.title"
          placeholder="链接标题（可选）"
          clearable
        />
      </el-form-item>
      <el-form-item label="分类">
        <el-select
          v-model="form.category"
          placeholder="选择分类"
          clearable
          style="width: 100%"
        >
          <el-option
            v-for="opt in categoryOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="描述">
        <el-input
          v-model="form.description"
          type="textarea"
          placeholder="添加描述（可选）"
          :rows="3"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('close')">取消</el-button>
      <el-button type="primary" @click="submit">保存</el-button>
    </template>
  </el-dialog>
</template>
