import {redirect} from "next/navigation";
import {createAuthClient} from "@/lib/supabase/server";
export const dynamic="force-dynamic";
export default async function AvailableModels(){
 const db=await createAuthClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect("/login");
 const {data:profile}=await db.from("profiles").select("is_superadmin").eq("id",user.id).single();
 if(!user.identities?.some(i=>i.provider==="google")||profile?.is_superadmin!==true)redirect("/login");
 const key=process.env.GEMINI_API_KEY;if(!key)return <main className="page-shell"><h1>Provider unavailable</h1><p>The server key is not configured.</p></main>;
 const response=await fetch("https://generativelanguage.googleapis.com/v1beta/models",{headers:{"x-goog-api-key":key},cache:"no-store",signal:AbortSignal.timeout(10000)});
 if(!response.ok)return <main className="page-shell"><h1>Provider unavailable</h1><p>Google returned HTTP {response.status}. Try again later.</p></main>;
 const body=await response.json();const models=(body.models||[]) as {name:string;displayName:string;supportedGenerationMethods?:string[]}[];
 return <main className="page-shell"><h1>Available Gemini models</h1><p>Live model identifiers returned by the connected Google project. Listed availability does not guarantee current serving capacity.</p><table><thead><tr><th>Model name</th><th>API identifier</th></tr></thead><tbody>{models.filter(m=>m.supportedGenerationMethods?.includes("generateContent")).map(m=><tr key={m.name}><td>{m.displayName}</td><td><code>{m.name.replace(/^models\//,"")}</code></td></tr>)}</tbody></table></main>;
}
