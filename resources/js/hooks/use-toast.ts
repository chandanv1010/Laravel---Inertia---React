import { toast as sonnerToast } from 'sonner'

export function useToast() {
  return {
    toast: (options: {
      title?: string
      description?: string
      variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info'
    }) => {
      const { title, description, variant = 'default' } = options

      switch (variant) {
        case 'destructive':
          sonnerToast.error(title || 'Lỗi', {
            description,
          })
          break
        case 'success':
          sonnerToast.success(title || 'Thành công', {
            description,
          })
          break
        case 'warning':
          sonnerToast.warning(title || 'Cảnh báo', {
            description,
          })
          break
        case 'info':
          sonnerToast.info(title || 'Thông tin', {
            description,
          })
          break
        default:
          sonnerToast(title || 'Thông báo', {
            description,
          })
      }
    },
  }
}
