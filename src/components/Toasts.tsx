export type Toast = { id: number; text: string; err?: boolean };

export function Toasts({ items }: { items: Toast[] }) {
    return (
        <div className="toasts fixed right-3 top-3 flex flex-col gap-2">
            {items.map(t => (
                <div key={t.id} className={`toast ${t.err ? 'error' : ''} text-xs px-3 py-2 rounded-xl border shadow`}>{t.text}</div>
            ))}
        </div>
    );
}
