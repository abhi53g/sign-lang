import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const data = [
  { name: 'Mon', translations: 120, accuracy: 0.86 },
  { name: 'Tue', translations: 180, accuracy: 0.88 },
  { name: 'Wed', translations: 150, accuracy: 0.9 },
  { name: 'Thu', translations: 220, accuracy: 0.89 },
  { name: 'Fri', translations: 170, accuracy: 0.91 },
];

const DashboardPage = () => {
  return (
    <div className="container mx-auto py-10">
      <SEO title="Dashboard — SignAI" description="Admin and research dashboard for analytics and dataset tools." />
      <h1 className="font-display text-2xl mb-4">Admin / Research Dashboard</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Usage (last 5 days)</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(v)=>`${Math.round(v*100)}%`} domain={[0.8, 1]} />
                <Tooltip />
                <Line yAxisId="left" type="monotone" dataKey="translations" stroke={'hsl(var(--primary))'} />
                <Line yAxisId="right" type="monotone" dataKey="accuracy" stroke={'hsl(var(--accent))'} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Dataset Upload</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <input type="file" multiple className="block w-full text-sm" />
            <Button variant="hero">Upload</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Annotation Tools</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Create labels, review samples, and export JSON annotations.</p>
            <Button variant="outline" className="mt-3">Open Annotator</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Model</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Current accuracy: 90.5%</p>
            <Button variant="soft">Retrain</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
