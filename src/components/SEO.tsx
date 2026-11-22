import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Lazima iendane kabisa na index.html
const SITE_NAME = 'SUNRISE PROFILE TUNDUMA'
const SITE_URL = 'https://sunriseprofile.com'

const DEFAULT_DESCRIPTION =
  'Welcome to SUNRISE PROFILE TUNDUMA. Explore quality glasses and aluminium profile products in Tanzania. Contact us for inquiries.'

const PAGE_SEO: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'SUNRISE PROFILE TUNDUMA | Quality Glasses & Aluminium Products',
    description: DEFAULT_DESCRIPTION,
  },
}

function setMeta(attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(
    `meta[${attribute}="${key}"]`
  )
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.appendChild(element)
  }
  element.content = content
}

export default function SEO() {
  const location = useLocation()

  useEffect(() => {
    const pathname = location.pathname.replace(/\/+$/, '') || '/'
    const page = PAGE_SEO[pathname]
    const isPublicPage = pathname === '/'

    const title = page?.title || SITE_NAME
    const description = page?.description || DEFAULT_DESCRIPTION

    document.title = title
    setMeta('name', 'description', description)
    setMeta(
      'name',
      'robots',
      isPublicPage ? 'index, follow, max-image-preview:large' : 'noindex, nofollow'
    )
    setMeta('property', 'og:type', 'website')
    setMeta('property', 'og:site_name', SITE_NAME)
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:url', `${SITE_URL}${pathname}`)
    setMeta('name', 'twitter:card', 'summary_large_image')
    setMeta('name', 'twitter:title', title)
    setMeta('name', 'twitter:description', description)

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = `${SITE_URL}${pathname}`
  }, [location.pathname])

  return null
}