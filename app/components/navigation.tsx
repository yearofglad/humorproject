import Link from "next/link";
import Image from "next/image";
import { currentUser } from "@/lib/profile";
import { signOut } from "@/app/auth/actions";

export async function Navigation() {
  const user = await currentUser();
  return <nav className="site-nav page-shell" aria-label="Main navigation">
    <Link className="brand" href="/">The Humor Project<span>not vibe coded</span></Link>
    <div className="nav-links">
      {user ? <>
        <Link href="/profile" aria-label="Your profile"><Image src="/design/profile.png" alt="" width={70} height={70} className="profile-icon" /></Link>
        <form action={signOut}><button className="button small outline">Sign out</button></form>
      </> : <Link className="button small" href="/login">Sign in</Link>}
    </div>
  </nav>;
}
