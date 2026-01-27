let loaded = false

export function loadCkfinder(): Promise<void> {
    return new Promise((resolve, reject) => {
        if(loaded){
            // Wait a bit to ensure CKFinder is fully initialized
            setTimeout(() => resolve(), 100)
            return
        }
        const script = document.createElement("script")
        script.src = '/plugins/ckfinder_2/ckfinder.js'
        script.async = true
        script.onload = () => {
            loaded = true
            // Wait a bit to ensure CKFinder is fully initialized
            setTimeout(() => resolve(), 100)
        } 
        script.onerror = () => {
            reject(new Error('Load CkFinder không thành công'))
        }
        document.body.appendChild(script)

    })
}