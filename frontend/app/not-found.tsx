import Link from "next/link";
export default function NotFound() { return <section className="section narrow"><h1>That find is gone.</h1><p>It may no longer be active.</p><Link className="button" href="/explore">Explore active finds</Link></section>; }
