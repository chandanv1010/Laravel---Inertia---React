import { useState } from "react";


type TEmitter = string | null | string[] | number[]
const useFormDateEmitter =  () => {

    const [formDataEmitter, setFormDataEmitter] = useState<Record<string, TEmitter >>({})

    const handleEmitterChange = (name: string, value: TEmitter) => {
        setFormDataEmitter(prev => ({
            ...prev,
            [name]: value
        }))
    }


    return {
        formDataEmitter,
        handleEmitterChange
    }
}

export default useFormDateEmitter