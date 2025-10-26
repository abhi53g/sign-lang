import { useParams } from "react-router-dom";
import { useState } from "react";

const alphabetSigns = [
  { letter: "A", animationUrl: "/letters/Letter-A.png" },
  { letter: "B", animationUrl: "/letters/Letter-B.png" },
  { letter: "C", animationUrl: "/letters/Letter-C.png" },
  { letter: "D", animationUrl: "/letters/Letter-D.png" },
  { letter: "E", animationUrl: "/letters/Letter-E.png" },
  { letter: "F", animationUrl: "/letters/Letter-F.png" },
  { letter: "G", animationUrl: "/letters/Letter-G.png" },
  { letter: "H", animationUrl: "/letters/Letter-H.png" },
  { letter: "I", animationUrl: "/letters/Letter-I.png" },
  { letter: "J", animationUrl: "/letters/Letter-J.png" },
  { letter: "K", animationUrl: "/letters/Letter-K.png" },
  { letter: "L", animationUrl: "/letters/Letter-L.png" },
  { letter: "M", animationUrl: "/letters/Letter-M.png" },
  { letter: "N", animationUrl: "/letters/Letter-N.png" },
  { letter: "O", animationUrl: "/letters/Letter-O.png" },
  { letter: "P", animationUrl: "/letters/Letter-P.png" },
  { letter: "Q", animationUrl: "/letters/Letter-Q.png" },
  { letter: "R", animationUrl: "/letters/Letter-R.png" },
  { letter: "S", animationUrl: "/letters/Letter-S.png" },
  { letter: "T", animationUrl: "/letters/Letter-T.png" },
  { letter: "U", animationUrl: "/letters/Letter-U.png" },
  { letter: "V", animationUrl: "/letters/Letter-V.png" },
  { letter: "W", animationUrl: "/letters/Letter-W.png" },
  { letter: "X", animationUrl: "/letters/Letter-X.png" },
  { letter: "Y", animationUrl: "/letters/Letter-Y.png" },
  { letter: "Z", animationUrl: "/letters/Letter-Z.png" },
];

const LessonDetailPage = () => {
  const { lessonId } = useParams();
  const [enlarged, setEnlarged] = useState<{ url: string; letter: string } | null>(null);

  if (lessonId === "Alphabet (A–Z)") {
    return (
      <div className="container mx-auto py-10">
        <h2 className="text-2xl font-bold mb-4">Alphabet (A–Z)</h2>
        <p className="mb-6">See the sign animation for each letter:</p>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {alphabetSigns.map((sign) => (
            <div key={sign.letter} className="flex flex-col items-center">
              <span className="font-bold">{sign.letter}</span>
              <img
                src={sign.animationUrl}
                alt={`Sign for ${sign.letter}`}
                className="w-20 h-20 object-contain cursor-pointer"
                onClick={() => setEnlarged({ url: sign.animationUrl, letter: sign.letter })}
              />
            </div>
          ))}
        </div>
        {enlarged && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80"
            onClick={() => setEnlarged(null)}
          >
            <img
              src={enlarged.url}
              alt={`Sign for ${enlarged.letter}`}
              className="max-w-full max-h-full"
              style={{ boxShadow: "0 0 40px #000" }}
            />
            <button
              className="absolute top-4 right-4 text-white text-3xl font-bold"
              onClick={() => setEnlarged(null)}
              aria-label="Close"
            >
              &times;
            </button>
          </div>
        )}
      </div>
    );
  }

  // Add similar blocks for other lessons
  return (
    <div className="container mx-auto py-10">
      <h2 className="text-2xl font-bold mb-4">{lessonId}</h2>
      <p>Lesson details and content coming soon.</p>
    </div>
  );
};

export default LessonDetailPage;