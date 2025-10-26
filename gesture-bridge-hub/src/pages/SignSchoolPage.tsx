import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, PlayCircle, Sparkles } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Link } from "react-router-dom";

const lessons = [
	{ title: "Alphabet (A–Z)", level: "Beginner", duration: "15 min" },
	{ title: "Greetings & Introductions", level: "Beginner", duration: "12 min" },
	{ title: "Numbers (1–20)", level: "Beginner", duration: "10 min" },
	{ title: "Everyday Phrases", level: "Intermediate", duration: "20 min" },
];

const SignSchoolPage = () => {
	return (
		<div className="container mx-auto py-10">
			<SEO
				title="Sign School — Learn ISL"
				description="Interactive ISL lessons with videos, practice, and progress tracking."
			/>
			<section className="relative overflow-hidden rounded-xl border bg-card p-8 md:p-12">
				<div
					className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[hsl(var(--accent)/0.2)] blur-3xl"
					aria-hidden
				/>
				<div className="flex items-start justify-between gap-6 relative">
					<div className="space-y-3 max-w-2xl">
						<h1 className="font-display text-3xl md:text-4xl">
							Sign School: Learn Indian Sign Language (ISL)
						</h1>
						<p className="text-muted-foreground">
							Short, friendly lessons with demos and practice. Perfect for
							students, teachers, and researchers getting started with ISL.
						</p>
						<div className="flex gap-3">
							<Button
								variant="hero"
								onClick={() =>
									toast({
										title: "Starting lesson",
										description: "Launching Alphabet (A–Z)",
									})
								}
							>
								<PlayCircle className="mr-2" /> Start First Lesson
							</Button>
							<Button variant="outline">
								<BookOpen className="mr-2" /> Browse Curriculum
							</Button>
						</div>
					</div>
					<Sparkles className="hidden md:block text-[hsl(var(--primary))]" />
				</div>
			</section>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-8">
				{lessons.map((l) => (
					<Card key={l.title} className="hover-scale">
						<CardHeader>
							<CardTitle>{l.title}</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground">
								{l.level} • {l.duration}
							</p>
							<Button asChild className="mt-3" size="sm">
								<Link to={`/lesson/${encodeURIComponent(l.title)}`}>
									Start Lesson
								</Link>
							</Button>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
};

export default SignSchoolPage;
