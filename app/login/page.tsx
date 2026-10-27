import {SignInPanel} from "./sign-in-panel";
export default async function Login({searchParams}:{searchParams:Promise<{error?:string;next?:string}>}){const {error,next}=await searchParams;return <SignInPanel error={error} next={next}/>;}
