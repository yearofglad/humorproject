export function safeAuthDestination(value:unknown){
 if(typeof value!=="string"||!value.startsWith("/")||value.startsWith("//")||/[\\\r\n]/.test(value))return "/";
 try{const url=new URL(value,"https://local.invalid");if(url.origin!=="https://local.invalid")return "/";
 const allowed=["/","/create","/profile","/members"].includes(url.pathname)||/^\/(captions|drafts)\/[a-f0-9-]{36}$/i.test(url.pathname);
 return allowed?url.pathname+url.search+url.hash:"/";
 }catch{return "/";}
}
