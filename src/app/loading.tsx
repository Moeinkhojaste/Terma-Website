export default function Loading() {
  return (
    <main className="loading-page" aria-label="در حال بارگذاری">
      <div className="loading-line loading-line--short" />
      <div className="loading-line loading-line--title" />
      <div className="loading-grid"><div /><div /><div /></div>
    </main>
  );
}
