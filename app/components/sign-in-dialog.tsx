"use client";
import {useEffect,useRef,type ReactNode} from "react";
import {useRouter} from "next/navigation";
export function SignInDialog({children}:{children:ReactNode}){
 const ref=useRef<HTMLDialogElement>(null);const router=useRouter();const close=()=>router.back();
 useEffect(()=>{const dialog=ref.current;const previous=document.body.style.overflow;dialog?.showModal();document.body.style.overflow="hidden";return()=>{dialog?.close();document.body.style.overflow=previous;};},[]);
 return <dialog ref={ref} className="sign-in-dialog" aria-labelledby="sign-in-title" onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===e.currentTarget)close();}}><section className="sign-in-card"><button className="modal-close" onClick={close} aria-label="Close sign-in">×</button>{children}<button className="text-button signin-dismiss" onClick={close}>Continue browsing</button></section></dialog>;
}
