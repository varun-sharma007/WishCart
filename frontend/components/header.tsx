import Link from "next/link";

export function Header() {
  return (
    <header>
      <Link className="brand" href="/">
        <b>WISH</b>CART
      </Link>
      <nav>
        <Link href="/">Home</Link>
        <Link href="/explore">Explore</Link>
        <Link href="/best-items">Best items</Link>
        <Link href="/suggest">Suggest a find</Link>
        <Link href="/admin" className="adminHeaderLink">
          Admin ⚙
        </Link>
      </nav>
    </header>
  );
}
