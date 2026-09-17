import { useEffect } from 'react';

interface DocumentMeta {
  title: string;
  description?: string;
  image?: string;
  canonical?: string;
  jsonLd?: Record<string, unknown>;
}

function setMetaTag(attr: 'name' | 'property', key: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function useDocumentMeta({ title, description, image, canonical, jsonLd }: DocumentMeta) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    if (description) {
      setMetaTag('name', 'description', description);
      setMetaTag('property', 'og:description', description);
      setMetaTag('name', 'twitter:description', description);
    }

    setMetaTag('property', 'og:title', title);
    setMetaTag('name', 'twitter:title', title);

    if (image) {
      setMetaTag('property', 'og:image', image);
      setMetaTag('name', 'twitter:image', image);
    }

    let canonicalEl: HTMLLinkElement | null = null;
    let previousCanonicalHref: string | null = null;
    if (canonical) {
      canonicalEl = document.querySelector('link[rel="canonical"]');
      if (!canonicalEl) {
        canonicalEl = document.createElement('link');
        canonicalEl.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalEl);
      }
      previousCanonicalHref = canonicalEl.getAttribute('href');
      canonicalEl.setAttribute('href', canonical);
      setMetaTag('property', 'og:url', canonical);
    }

    let jsonLdEl: HTMLScriptElement | null = null;
    if (jsonLd) {
      jsonLdEl = document.createElement('script');
      jsonLdEl.type = 'application/ld+json';
      jsonLdEl.text = JSON.stringify(jsonLd);
      document.head.appendChild(jsonLdEl);
    }

    return () => {
      document.title = previousTitle;
      if (canonicalEl && previousCanonicalHref) {
        canonicalEl.setAttribute('href', previousCanonicalHref);
      }
      if (jsonLdEl) {
        jsonLdEl.remove();
      }
    };
  }, [title, description, image, canonical, jsonLd]);
}
