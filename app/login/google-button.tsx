"use client";
import {useState} from "react";
import {createBrowserAuthClient} from "@/lib/supabase/browser";
import {safeAuthDestination} from "@/lib/auth-destination";
export function GoogleButton({next="/"}:{next?:string}){
 const [pending,setPending]=useState(false);const [error,setError]=useState<string>();
 async function signIn(){setPending(true);setError(undefined);try{
  const destination=safeAuthDestination(next);
  document.cookie=`humor-auth-next=${encodeURIComponent(destination)}; Path=/; Max-Age=600; SameSite=Lax${location.protocol==="https:"?"; Secure":""}`;
  const {error}=await createBrowserAuthClient().auth.signInWithOAuth({provider:"google",options:{redirectTo:`${location.origin}/auth/callback`}});if(error)throw error;
 }catch{setError("Google sign-in couldn’t start. Try again, or continue browsing.");setPending(false);}}
 return <><button className="button google-button" onClick={signIn} disabled={pending} aria-label="Sign in with Google"><span className="google-mark" aria-hidden="true">G</span>{pending?"Opening Google…":"Continue with Google"}</button>{error&&<p role="alert" className="form-error">{error}</p>}</>;
}
