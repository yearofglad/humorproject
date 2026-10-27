import Link from "next/link";
import Image from "next/image";
import { currentUser } from "@/lib/profile";
import { signOut } from "@/app/auth/actions";

export async function Navigation() {
  const user = await currentUser();
  return <nav className="site-nav page-shell" aria-label="Main navigation">
    <div className="brand-lockup">
      <Link className="brand" href="/">The Humor Project</Link>
      <Link className="brand-face" href={user ? "/profile" : "/login"} aria-label={user ? "Your profile" : "Sign in"}>
        <Image src={user ? "/design/profile.png" : "/design/person.png"} alt="" width={70} height={70} />
      </Link>
    </div>
    <div className="nav-links"><Link className="nav-text" href="/">Browse</Link><Link className="nav-text" href="/create">Create</Link>
      {user ? <>
        <form action={signOut}><button className="button small outline">Sign out</button></form>
      </> : <Link className="button small" href="/login">Sign in</Link>}
    </div>
  </nav>;
}
