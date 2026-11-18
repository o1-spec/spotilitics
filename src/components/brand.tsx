import Link from 'next/link';
export function Brand(){return <Link className="brand" href="/" aria-label="Spotlytics home"><span className="brand-mark"><i/><i/><i/><i/></span>spotlytics<span className="brand-star">✳</span></Link>}
export function SpotifyIcon(){return <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="12"/><g fill="none" stroke="var(--spotify-stroke, #bbfa5b)" strokeWidth="1.6" strokeLinecap="round"><path d="M5 8.5Q12 6 19 9.5M6 12Q12 10 18 13M7 15.5Q12 14 17 16"/></g></svg>}
