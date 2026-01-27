import { useEffect, useRef } from "react"
import { Textarea } from "./ui/textarea"

// CKEditor types
interface CKEditorInstance {
    setData: (data: string) => void
    getData: () => string
    on: (event: string, callback: () => void) => void
    destroy: (noUpdate?: boolean) => void
    container?: {
        $?: HTMLElement
    }
}

interface CKEditorStatic {
    replace: (element: HTMLTextAreaElement, config: Record<string, unknown>) => CKEditorInstance
    instances: Record<string, CKEditorInstance>
}

interface WindowWithCKEditor extends Window {
    CKEDITOR?: CKEditorStatic
}

interface CkeditorProps {
    name: string,
    value?: string,
    height?: number
    onChange?: (data: string) => void
}

export default function Ckeditor({
    name,
    value,
    height = 200,
    onChange
}: CkeditorProps) {

    const editorRef = useRef<HTMLTextAreaElement>(null)
    const instanceRef = useRef<CKEditorInstance | null>(null)
    const onChangeRef = useRef(onChange)
    const isInitializedRef = useRef(false)
    const isUpdatingRef = useRef(false)

    // Cập nhật onChange ref khi onChange thay đổi
    useEffect(() => {
        onChangeRef.current = onChange
    }, [onChange])

    // Init editor - chỉ chạy khi mount hoặc name/height thay đổi
    useEffect(() => {
        const loadEditor = () => {
            const windowWithCKEditor = window as WindowWithCKEditor
            const Ckeditor = windowWithCKEditor.CKEDITOR
            if(!Ckeditor){
                const script = document.createElement("script")
                script.src = '/plugins/ckeditor/ckeditor.js'
                script.async = true
                script.onload = () => {
                    console.log("CKEDITOR Loaded");
                    initEditor()
                }
                document.body.appendChild(script)
            }else{
                initEditor()
            }
        }

        const initEditor = () => {
            const windowWithCKEditor = window as WindowWithCKEditor
            const Ckeditor = windowWithCKEditor.CKEDITOR
            if (!Ckeditor) return
            if(!editorRef.current) return

            // Chỉ destroy và recreate nếu chưa init hoặc name/height thay đổi
            if(Ckeditor.instances[name] && !isInitializedRef.current){
                Ckeditor.instances[name].destroy(true)
            }
            
            if(!isInitializedRef.current){
                instanceRef.current = Ckeditor.replace( editorRef.current, {
                    height: height,
                    entities: true,
                    allowedContent: true,
                    toolbarGroups: [
                        { name: 'editing',     groups: [ 'find', 'selection', 'spellchecker','undo' ] },
                        { name: 'links' },
                        { name: 'insert' },
                        { name: 'forms' },
                        { name: 'tools' },
                        { name: 'document',    groups: [ 'mode', 'document', 'doctools'] },
                        { name: 'others' },
                        { name: 'basicstyles', groups: [ 'basicstyles', 'cleanup','colors','styles','indent'  ] },
                        { name: 'paragraph',   groups: [ 'list', '', 'blocks', 'align', 'bidi' ] },
                    ],
                    removeButtons: 'Save,NewPage,Pdf,Preview,Print,Find,Replace,CreateDiv,SelectAll,Symbol,Block,Button,Language',
                    removePlugins: "exportpdf",
                });
                
                // Thêm border-radius 8px cho editor container
                if(instanceRef.current && instanceRef.current.container) {
                    const container = instanceRef.current.container.$
                    if(container) {
                        container.style.borderRadius = '8px'
                        container.style.overflow = 'hidden'
                    }
                }

                if(instanceRef.current){
                    instanceRef.current.setData(value || "")
                    instanceRef.current.on("change", function(){
                        // Set flag khi user typing để tránh update lại từ props
                        isUpdatingRef.current = true
                        const data = instanceRef.current?.getData() || ''
                        if(onChangeRef.current) onChangeRef.current(data)
                        // Reset flag sau khi onChange được gọi
                        setTimeout(() => {
                            isUpdatingRef.current = false
                        }, 50)
                    })
                    isInitializedRef.current = true
                }
            }
        }
        loadEditor()
        return () => {
            if(instanceRef.current){
                instanceRef.current.destroy(true)
                instanceRef.current = null
                isInitializedRef.current = false
            }
        }
    }, [name, height]) // Chỉ phụ thuộc vào name và height

    // Update value riêng - không recreate editor
    useEffect(() => {
        if(instanceRef.current && isInitializedRef.current && !isUpdatingRef.current){
            const currentData = instanceRef.current.getData()
            // Chỉ update nếu value thực sự thay đổi từ bên ngoài (không phải từ user typing)
            if(currentData !== value && value !== undefined){
                isUpdatingRef.current = true
                instanceRef.current.setData(value || "")
                // Reset flag sau một khoảng thời gian ngắn
                setTimeout(() => {
                    isUpdatingRef.current = false
                }, 100)
            }
        }
    }, [value]) // value được kiểm tra trong condition

    return <Textarea ref={editorRef} name={name} defaultValue={value} />
}
