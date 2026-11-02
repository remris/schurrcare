import ListEditor from "@/components/ListEditor";

export default function OmaPage() {
  return (
    <main className="page oma">
      <header className="top">
        <h1>🧺 Meine Einkaufsliste</h1>
        <a href="/?choose=1" className="switch" aria-label="Ansicht wechseln">⋯</a>
      </header>
      <ListEditor />
    </main>
  );
}
