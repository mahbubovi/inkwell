export default function AuthCard({ title, sub, footer, children }) {
  return (
    <section className="px-4 py-12">
      <div className="card max-w-md mx-auto p-6 sm:p-8">
        <h1 className="font-serif text-3xl font-semibold">{title}</h1>
        <p className="text-sm text-mute mt-1">{sub}</p>
        {children}
        <p className="mt-6 text-sm text-mute text-center">{footer}</p>
      </div>
    </section>
  );
}
