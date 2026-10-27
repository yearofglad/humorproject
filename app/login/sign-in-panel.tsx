import Link from "next/link";
import {redirect} from "next/navigation";
import {currentUser} from "@/lib/profile";
import {safeAuthDestination} from "@/lib/auth-destination";
import {GoogleButton} from "./google-button";
import {SignInDialog} from "@/app/components/sign-in-dialog";
export async function SignInPanel({error,intercepted=false,next="/"}:{error?:string;intercepted?:boolean;next?:string}){
 const destination=safeAuthDestination(next);if(await currentUser())redirect(destination);
 const configured=process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 const content=<><p className="eyebrow">THE HUMOR PROJECT</p><h2 id="sign-in-title">Save favorites. Make captions.</h2><p className="signin-copy">Browse without an account. Sign in to vote, save captions, and create your own.</p>{error&&<p className="form-error" role="alert">Google sign-in wasn’t completed. Try again below.</p>}{configured?<GoogleButton next={destination}/>:<p role="alert">Sign-in is temporarily unavailable. You can still browse captions.</p>}</>;
 return intercepted?<SignInDialog>{content}</SignInDialog>:<main className="page-shell signin-page"><section className="sign-in-card">{content}<Link className="text-button signin-dismiss" href="/">← Back to the gallery</Link></section></main>;
}
