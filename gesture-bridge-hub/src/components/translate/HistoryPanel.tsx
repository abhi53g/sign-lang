import { Button } from "@/components/ui/button";

export interface HistoryItem {
  id: string;
  text: string;
  ts: string;
}

export const HistoryPanel = ({ items = [] }: { items?: HistoryItem[] }) => {
  const list = items.length ? items : [
    { id: '1', text: 'Hello, my name is Alex.', ts: new Date().toLocaleString() },
    { id: '2', text: 'Thank you!', ts: new Date(Date.now()-3600000).toLocaleString() },
  ];

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">History</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">Download</Button>
          <Button variant="outline" size="sm">Share</Button>
        </div>
      </div>
      <ul className="space-y-2">
        {list.map(i => (
          <li key={i.id} className="flex items-center justify-between rounded-md border p-2">
            <span className="truncate max-w-[70%] text-sm">{i.text}</span>
            <span className="text-xs text-muted-foreground">{i.ts}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
