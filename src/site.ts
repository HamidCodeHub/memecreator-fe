import { siFacebook, siInstagram, siX, type SimpleIcon } from 'simple-icons'

// The Memes for Laughs social media pages, shown in the footer.
// TODO: replace with the real profile URLs (e.g. https://www.instagram.com/<your-handle>/).
export const SOCIAL: { name: string; url: string; icon: SimpleIcon }[] = [
  { name: 'Facebook', url: 'https://www.facebook.com/', icon: siFacebook },
  { name: 'X', url: 'https://x.com/', icon: siX },
  { name: 'Instagram', url: 'https://www.instagram.com/', icon: siInstagram },
]
