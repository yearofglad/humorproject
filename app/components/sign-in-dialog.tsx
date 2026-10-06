"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export function SignInDialog({ children, intercepted = false }: { children: ReactNode; intercepted?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const close = () => intercepted ? router.back() : router.replace("/");
  useEffect(() => {
    const dialog = ref.current;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);
  return <dialog ref={ref} className="sign-in-dialog" aria-labelledby="sign-in-title"
    onCancel={event => { event.preventDefault(); close(); }}
    onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <section className="sign-in-glass">
      <button className="modal-close" onClick={close} aria-label="Close sign-in">×</button>
      <h2 className="sr-only" id="sign-in-title">Sign in</h2>
      <div className="sign-in-content">{children}</div>
    </section>
  </dialog>;
}
