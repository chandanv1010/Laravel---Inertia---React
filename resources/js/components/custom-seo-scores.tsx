/* eslint-disable react-hooks/exhaustive-deps */
import { CheckCircle, XCircle } from "lucide-react"
import { useFormContext } from "@/contexts/FormContext"
import { useMemo } from "react"
import { toSlug } from "@/lib/helper"

interface ISeoCheck {
    label: string,
    passed: boolean,
    message: string,
    detail?: string[]
}

const META_TITLE_MAX = 71
const META_DESCRIPTION_MAX = 300
const CONTENT_MIN = 100


// interface ICustomSeoScoresProps{
//     imageCount?: number
// }

const getPlainText = (html: string): string => {
    if(!html) return ''
    try {
        const parser = new DOMParser()
        const doc = parser.parseFromString(html, 'text/html')
        const plainText = doc.body.textContent || doc.body.innerHTML || ''
        return plainText.trim()


    } catch  {
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = html
        const plainText = tempDiv.textContent || tempDiv.innerText || ''
        return plainText.trim()
    }
}

const containsKeyword = (text: string, keywords: string) => {
    if(!text || !keywords) return false

    const keywordList = keywords.split(',').map(k => k.trim()).filter(k => k.length > 0)
    if(keywordList.length === 0) return false

    const textToSlug = toSlug(text) 

    for(const keyword of keywordList){
        const keywordToSlug = toSlug(keyword)
        if(textToSlug.includes(keywordToSlug)) return true
    }

    return false;
}

interface IExternalLink{
    hasExternal: boolean,
    count: number,
    domains: string[]
}
const hasExternalLinks = (html: string): IExternalLink => {
    if(!html) return { hasExternal: false, count: 0, domains: [] }
    try {
        const parser = new DOMParser()
        const doc = parser.parseFromString(html, 'text/html')
        const externalDomains = new Set<string>()
        let countExternal = 0
        const links = doc.querySelectorAll('a[href]')
        const currentDomain = window.location.hostname

        links.forEach(link => {
            const href = link.getAttribute('href') || ''
            if(href.startsWith('http://') || href.startsWith('https://')){
                try{
                    const url = new URL(href)
                    if(url.hostname !== currentDomain && url.hostname !== ''){
                        externalDomains.add(url.hostname)
                        countExternal++
                    }
                }catch {
                    // skip
                }
            }
        })

        return {
            hasExternal: countExternal > 0,
            count: countExternal,
            domains: Array.from(externalDomains)
        }



    } catch {
        return { hasExternal: false, count: 0, domains: [] }
    }
}

interface IHeadingInfo {
    h2Count: number,
    h3Count: number,
}
const checkHeading = (html: string): IHeadingInfo => {
    if(!html) return {h2Count: 0, h3Count: 0}
    try {
        const parser = new DOMParser()
        const doc = parser.parseFromString(html, 'text/html')
        const h2 = doc.querySelectorAll('h2')
        const h3 = doc.querySelectorAll('h3')

        return {
            h2Count: h2.length,
            h3Count: h3.length
        }
        
    } catch{
        return {h2Count: 0, h3Count: 0}
    }
}

interface IContentStatus {
    textLength: number,
    htmlSizeKB: number,
    imageCount: number,
    externalLinkCount: number,
}
const getContentStatus = (html: string): IContentStatus => {
    if(!html) return { textLength: 0, htmlSizeKB: 0, imageCount: 0, externalLinkCount: 0 }

    const plainText = getPlainText(html)
    const textLength = plainText.length
    const htmlSizeKB = html.length / 1024

    const externalLink = hasExternalLinks(html)
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const img = doc.querySelectorAll('img')
    const imageCount = img.length

    return {
        textLength,
        htmlSizeKB,
        imageCount,
        externalLinkCount: externalLink.count

    }

}

export default function CustomSeoScores(){

    const { 
        name,
        image,
        content,
        canonical,
        metaKeyword,
        metaTitle,
        metaDescription,
        selectedRobots,
    } = useFormContext()

    const displayCanonical = useMemo(() => canonical || toSlug(name), [canonical, name])
    const plainContent = useMemo(() => getPlainText(content),[content])
    const contentLengh = plainContent.length

    const keywordInTitle = useMemo(() => 
        metaKeyword ? containsKeyword(metaTitle, metaKeyword) : false, 
        [metaTitle, metaKeyword]
    )

    const keywordInDescription = useMemo(() => 
        metaKeyword ? containsKeyword(metaDescription, metaKeyword) : false, 
        [metaDescription, metaKeyword]
    )

    const keywordInContent = useMemo(() => 
        metaKeyword ? containsKeyword(plainContent, metaKeyword) : false, 
        [plainContent, metaKeyword]
    )

    const externalLink = useMemo(() => hasExternalLinks(content), [content])

    const headingInfo = useMemo(() => checkHeading(content), [content])

    const contentStatus = useMemo(() => getContentStatus(content), [content])


    const checks: ISeoCheck[] = useMemo(() => [
        {
            label: 'Tiêu đề Bài Viết',
            passed: !!name && name.length > 0,
            message: name || 'Chưa nhập tiêu đề bài viết'
        },
        {
            label: 'Tiêu đề SEO',
            passed: !!metaTitle && metaTitle.length > 0 && metaTitle.length < META_TITLE_MAX,
            message: metaTitle 
                ? `${metaTitle.length}/${META_TITLE_MAX} ký tự${metaTitle.length > META_TITLE_MAX ? ' (vượt quá)' : ''}`
                : 'Chưa nhập Tiêu đề SEO'
        },
        {
            label: 'Mô Tả SEO',
            passed: !!metaDescription && metaDescription.length > 0 && metaDescription.length < META_DESCRIPTION_MAX,
            message: metaDescription 
                ? `${metaDescription.length}/${META_DESCRIPTION_MAX} ký tự${metaDescription.length > META_DESCRIPTION_MAX ? ' (vượt quá)' : ''}`
                : 'Chưa nhập Mô Tả Seo'
        },
        {
            label: 'Đường dẫn (Canonical)',
            passed: !!displayCanonical && displayCanonical.length > 0,
            message: displayCanonical || 'Chưa nhập đường dẫn'
        },
        {
            label: 'Từ khóa SEO',
            passed: !!metaKeyword && metaKeyword.length > 0,
            message: metaKeyword || 'Bạn chưa nhập từ khóa SEO'
        },
        {
            label: 'Từ khóa trong tiêu đề',
            passed: keywordInTitle,
            message: keywordInTitle
                ? "Tiêu đề đã có chứa từ khóa cần SEO"
                : metaKeyword
                    ? "Từ khóa chưa có trong tiêu đề"
                    : "Chưa có từ khóa SEO để kiểm tra"
        },
        {
            label: 'Từ khóa trong mô tả',
            passed: !!keywordInDescription,
            message: keywordInDescription
                ? "Mô tả đã có chứa từ khóa cần SEO"
                : metaKeyword
                    ? "Từ khóa chưa có trong mô tả"
                    : "Chưa có từ khóa SEO để kiểm tra"
        },
        {
            label: 'Từ khóa trong nội dung',
            passed: !!keywordInContent,
            message: keywordInContent
                ? "Nội dung đã có chứa từ khóa cần SEO"
                : metaKeyword
                    ? "Từ khóa chưa có trong nội dung của bài viết"
                    : "Chưa có từ khóa SEO để kiểm tra"
        },
        {
            label: 'Nội dung',
            passed: contentLengh > CONTENT_MIN,
            message: content
                ? `${contentLengh} ký tự${contentLengh < CONTENT_MIN ?  ` (tối thiểu cần ${CONTENT_MIN} ký tự)` : ""}`
                : `Nội dung quá ngắn hoặc chưa có nội dung tối thiểu ${CONTENT_MIN} ký tự`
        },
        {
            label: 'Robots Index',
            passed: selectedRobots === 'index',
            message: selectedRobots === 'index'
                ? "Nội dung đã được Index"
                : "Nội dung chưa được index"
        },
        {
            label: 'Ảnh đại diện',
            passed: !!image && image.length > 0,
            message: image 
                ? 'Đã có ảnh đại diện'
                : 'Chưa có ảnh đại diện'
        },
        {
            label: 'External Links',
            passed: content && content.length && !externalLink.hasExternal || externalLink.count <= 3,
            message: externalLink.hasExternal
                ? `${externalLink.count} external links${externalLink.count > 3 ? ' (không tốt cho SEO)' : '(chấp nhận được)'}`
                : content 
                    ? 'Không có External Link (Tốt cho SEO)'
                    : 'Chưa có nội dung để tính toán'
        },
        {
            label: 'Cấu trúc heading',
            passed: headingInfo.h2Count >= 1,
            message: headingInfo.h2Count > 0 || headingInfo.h3Count > 0
                ? `${headingInfo.h2Count} H2, ${headingInfo.h3Count} H3${headingInfo.h2Count < 1 ? ' (nên có ít nhất 1 thẻ H2)' : ''}`
                : "Chưa có H2 hoặc H3 (không thể tạo mục lục tự động)"
        },
        {
            label: 'Thống kê khác',
            passed: true,
            message: "Thông tin nội dung",
            detail: [
                `Số ảnh: ${contentStatus.imageCount}`,
                `Số text: ${contentStatus.textLength} ký tự`,
                `HTML: ${contentStatus.htmlSizeKB}`,
                `Số link external: ${contentStatus.externalLinkCount}`
            ]
        }
    ], [
        name, 
        metaTitle, 
        metaKeyword, 
        metaDescription, 
        externalLink, 
        content, 
        image , 
        selectedRobots, 
        headingInfo, 
        contentStatus, 
        keywordInContent, 
        keywordInDescription, 
        contentLengh,
        keywordInTitle,
        displayCanonical
    ])
    
    
    
    

    const passedCount = useMemo(() => checks.filter(c => c.passed).length, [checks])
    const totalCount = checks.length
    const score = Math.round((passedCount / totalCount) * 100)

    const getScoreColor = () => {
        if(score > 80) return 'text-green-600'
        if(score >= 50) return 'text-yellow-600'
        return 'text-red-600'
    }

    const getScoreBackground = () => {
         if(score > 80) return 'bg-green-100'
        if(score >= 50) return 'bg-yellow-100'
        return 'bg-red-100'
    }


    return (
        <div className="w-full">
            <div className={`rounded-[5px] p-4 mb-4 ${getScoreBackground()}`}>
                <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">ĐIỂM SEO</span>
                    <span className={`text-2xl font-bold ${getScoreColor()}`}>{score}%</span>
                </div>
                <div className="text-sm text-gray-600">
                    {passedCount}/{totalCount} tiêu chí đạt yêu cầu
                </div>
            </div>
            <div className="space-y-2">
                {checks.map((check, index) => (
                    <div key={index} className="flex items-start gap-2">
                        {check.passed ? <CheckCircle className="size-5 text-green-500 flex-shrink" /> : <XCircle className="size-5 text-red-500 flex-shrink" />}
                        <div className="flex-1">
                            <div className="text-sm font-medium">{check.label}</div>
                            {check.message && (
                                <div className="text-xs text-gray-500">{check.message}</div>
                            )}
                            {check.detail && check.detail.length > 0 && (
                                <div className="text-xs mt-[5px] text-gray-400 space-y-1 pl-[20px]">
                                    {check.detail.map((detail, id_index) => (
                                        <div key={id_index}>- {detail}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
