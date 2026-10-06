"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="page-shell narrow"><div className="notice" role="alert">
    <h1>One small hiccup.</h1>
    <p>We couldn’t load this page. Please try again. If you’re setting up the app, check the profile migration and server environment settings.</p>
    <button className="button" onClick={reset}>Try again</button>
  </div></main>;
}
