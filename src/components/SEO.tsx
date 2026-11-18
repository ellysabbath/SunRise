
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const SITE_NAME = 'SUNRISE GLASSES& ALUMINIUM PROFILES'
const SITE_URL = 'https://www.sunriseprofile.com'

const DEFAULT_DESCRIPTION =
  'Simamia biashara yako kwa urahisi. Dhibiti maduka, mauzo, bidhaa, oda, wafanyakazi, mishahara, matumizi na ripoti kupitia mfumo mmoja.'

const PAGE_SEO: Record<
  string,
  { title: string; description: string }
> = {
  '/': {
    title: 'Mfumo wa Usimamizi wa Biashara Tanzania | POS & Inventory',
    description: DEFAULT_DESCRIPTION,
  },
  '/login': {
    title: 'Ingia kwenye Akaunti | ' + SITE_NAME,
    description: 'Ingia kwenye akaunti yako ya kusimamia biashara.',
  },
  '/register': {
    title: 'Jisajili | ' + SITE_NAME,
    description: 'Fungua akaunti na anza kusimamia biashara yako.',
  },
  '/forgot-password': {
    title: 'Umesahau Nenosiri? | ' + SITE_NAME,
    description: 'Rejesha nenosiri la akaunti yako kwa usalama.',
  },
  '/reset-password': {
    title: 'Badilisha Nenosiri | ' + SITE_NAME,
    description: 'Weka nenosiri jipya la akaunti yako.',
  },
  '/verify-phone': {
    title: 'Thibitisha Namba ya Simu | ' + SITE_NAME,
    description: 'Thibitisha namba yako ya simu.',
  },
}

function setMeta(
  attribute: 'name' | 'property',
  key: string,
  content: string
) {
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

    // Kurasa za umma pekee ndizo zinazoruhusiwa kuorodheshwa.
    const isPublicPage = pathname === '/'

    const title = page?.title || SITE_NAME
    const description = page?.description || DEFAULT_DESCRIPTION

    document.title = title

    setMeta('name', 'description', description)

    setMeta(
      'name',
      'robots',
      isPublicPage
        ? 'index, follow, max-image-preview:large'
        : 'noindex, nofollow'
    )

    setMeta('property', 'og:type', 'website')
    setMeta('property', 'og:site_name', SITE_NAME)
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', description)
    setMeta(
      'property',
      'og:url',
      `${SITE_URL}${pathname}`
    )

    setMeta('name', 'twitter:card', 'summary_large_image')
    setMeta('name', 'twitter:title', title)
    setMeta('name', 'twitter:description', description)

    let canonical = document.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]'
    )

    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }

    canonical.href = `${SITE_URL}${pathname}`

  }, [location.pathname])

  return null
}
