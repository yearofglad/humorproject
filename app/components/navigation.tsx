import Link from "next/link";
import { currentUser } from "@/lib/profile";
import { signOut } from "@/app/auth/actions";

export async function Navigation() {
  const user = await currentUser();
  return <nav className="site-nav page-shell" aria-label="Main navigation">
    <Link className="brand" href="/">The Humor Project</Link>
    <div className="nav-links">
      <Link href="/">Gallery</Link>
      <Link href="/create">Create</Link>
      {user ? <>
        <Link href="/?view=likes">My likes</Link>
        <Link href="/profile">Profile</Link>
        <form action={signOut}><button className="text-button">Sign out</button></form>
      </> : <Link className="button small" href="/login">Sign in</Link>}
    </div>
  </nav>;
}
