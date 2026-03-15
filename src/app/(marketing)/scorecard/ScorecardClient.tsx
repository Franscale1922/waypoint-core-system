"use client";

import { useState, useEffect } from "react";
import { trackQuizStarted, trackQuizCompleted, trackBookCallClicked } from "../../lib/analytics";

const questions = [
  {
    id: "capital",
    question: "How much liquid capital do you have available to invest?",
    options: [
      { label: "Under $50K", value: 10 },
      { label: "$50K – $150K", value: 20 },
      { label: "$150K – $350K", value: 30 },
      { label: "$350K – $1M+", value: 40 },
    ],
  },
  {
    id: "driver",
    question: "What is the primary reason you are exploring business ownership?",
    options: [
      { label: "I was recently laid off or left a role", value: 25, tag: "Displacement" },
      { label: "I want more control over my income and schedule", value: 25, tag: "Autonomy" },
      { label: "I want to build something I can pass down", value: 20, tag: "Legacy" },
      { label: "I am looking for a better return on my capital", value: 20, tag: "ROI" },
      { label: "I want to build income outside my job before I leave", value: 22, tag: "Off-Ramp" },
    ],
  },
  {
    id: "timeline",
    question: "How soon are you looking to make a move?",
    options: [
      { label: "Within 3 months", value: 25 },
      { label: "3 to 6 months", value: 20 },
      { label: "6 to 12 months", value: 10 },
      { label: "Just exploring for now", value: 5 },
    ],
  },
  {
    id: "experience",
    question: "Have you ever owned or operated a business?",
    options: [
      { label: "Yes, I currently own one", value: 15 },
      { label: "Yes, in the past", value: 12 },
      { label: "No, but I have managed teams or P&Ls", value: 10 },
      { label: "No, this would be my first time", value: 8 },
    ],
  },
  {
    id: "fear",
    question: "What is your biggest concern about franchise ownership?",
    options: [
      { label: "Financial risk to my family", value: 0, tag: "Capital Risk" },
      { label: "Giving up a stable paycheck and benefits", value: 0, tag: "Golden Handcuffs" },
      { label: "Not knowing if I can actually run a business", value: 0, tag: "Competence" },
      { label: "Choosing the wrong franchise", value: 0, tag: "Fit Anxiety" },
    ],
  },
];

export default function ScorecardClient() {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { value: number; tag?: string }>>({});
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Track quiz start on mount
  useEffect(() => { trackQuizStarted(); }, []);

  const handleAnswer = (questionId: string, value: number, tag?: string) => {
    setAnswers({ ...answers, [questionId]: { value, tag } });
    if (currentStep < questions.length - 1) {
      setTimeout(() => setCurrentStep(currentStep + 1), 300);
    } else {
      setTimeout(() => setCurrentStep(questions.length), 300);
    }
  };

  const calculateScore = () => {
    return Object.values(answers).reduce((sum, a) => sum + a.value, 0);
  };

  const handleSubmit = async () => {
    if (!email || !name) return;
    setIsSubmitting(true);

    const score = calculateScore();
    const primaryDriver = answers.driver?.tag || "Unknown";
    const biggestFear = answers.fear?.tag || "Unknown";

    try {
      await fetch("/api/scorecard-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          score,
          primaryDriver,
          biggestFear,
        }),
      });
      trackQuizCompleted(score);
      setSubmitted(true);
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const score = calculateScore();

  if (submitted) {
    return (
      <section className="py-16 sm:py-24 bg-gradient-to-br from-[#f2f7fc] via-white to-[#fbf5ea]/40 min-h-[80vh]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#f5ebd1] mb-5 sm:mb-6">
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-[#c08b3e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1b3a5f]">
            Your Readiness Score: {score}/100
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-xl mx-auto leading-relaxed">
            {score >= 80
              ? "You look like a strong candidate. This is the profile I see move quickly and confidently. A 30-minute conversation would tell us both a lot."
              : score >= 60
              ? "Promising fit. You have a solid foundation. There are a few things worth talking through before you start looking at brands."
              : score >= 40
              ? "Worth exploring, with some real questions to work through first. I would rather have an honest conversation now than watch you struggle later."
              : "Honest answer: right now may not be the right time. That is not a bad thing. It just means the timing or foundation needs work first. Here are some resources that might help."}
          </p>
          {score >= 40 ? (
            <>
              <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href="/book"
                  onClick={() => trackBookCallClicked("scorecard_results")}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-sm font-semibold text-[#0c1929] bg-[#d4a55a] hover:bg-[#c49848] rounded-xl shadow-md transition-all press-effect min-h-[52px]"
                >
                  Book a Free Call
                </a>
                <a
                  href="sms:+12149951062"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-semibold text-[#0c1929] bg-[#d4a55a] hover:bg-[#c49848] rounded-xl shadow-md transition-all press-effect min-h-[52px]"
                >
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v7a2 2 0 01-2 2H6l-4 4V5z" clipRule="evenodd" />
                  </svg>
                  Text Me Instead
                </a>
              </div>
              <p className="mt-3 text-xs text-slate-400">
                This call is free. Franchise brands pay the referral fee, not you.
              </p>
              <p className="mt-6 text-sm text-slate-500 mb-3">Want to know what kind of franchise owner you are?</p>
              <a
                href="/archetype"
                className="inline-flex items-center justify-center px-7 py-3.5 text-sm font-semibold text-white bg-[#1b3a5f] hover:bg-[#234e7e] rounded-xl transition-all press-effect min-h-[48px]"
              >
                Find Your Owner Type
              </a>
            </>
          ) : (
            <div className="mt-6 sm:mt-8 space-y-3">
              <a
                href="/resources"
                className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-[#0c1929] bg-[#d4a55a] hover:bg-[#e2be80] rounded-xl shadow-lg transition-all press-effect min-h-[48px]"
              >
                Browse Franchise Resources
              </a>
              <p className="text-xs text-slate-400 mt-2">
                Or <a href="/book" className="underline hover:text-slate-600" onClick={() => trackBookCallClicked("scorecard_results_low")}>book a call anyway</a>. Sometimes the honest conversation is the most useful one.
              </p>
            </div>
          )}
        </div>
      </section>
    );
  }

  // Email capture step (after all questions)
  if (currentStep >= questions.length) {
    return (
      <section className="py-16 sm:py-24 bg-gradient-to-br from-[#f2f7fc] via-white to-[#fbf5ea]/40 min-h-[80vh]">
        <div className="max-w-xl mx-auto px-4 sm:px-6">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#1b3a5f] text-center">
            Almost there. Where should I send your results?
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-500 text-center">
            Your score is calculated. Drop your name and email and I will
            show you exactly where you stand.
          </p>
          <div className="mt-6 sm:mt-8 space-y-3 sm:space-y-4">
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 sm:px-5 py-3.5 sm:py-4 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#c08b3e] focus:border-transparent text-base min-h-[48px]"
            />
            <input
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 sm:px-5 py-3.5 sm:py-4 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#c08b3e] focus:border-transparent text-base min-h-[48px]"
            />
            <button
              onClick={handleSubmit}
              disabled={!email || !name || isSubmitting}
              className="w-full py-4 bg-gradient-to-r from-[#1b3a5f] to-[#234e7e] hover:from-[#234e7e] hover:to-[#2c6299] text-white font-semibold rounded-xl shadow-lg transition-all disabled:opacity-50 press-effect min-h-[48px] text-base"
            >
              {isSubmitting ? "Calculating..." : "See My Score"}
            </button>
          </div>
          <p className="mt-4 text-xs text-slate-400 text-center">
            We will never sell your information. Zero spam guarantee.
          </p>
        </div>
      </section>
    );
  }

  const q = questions[currentStep];

  return (
    <section className="py-16 sm:py-24 bg-gradient-to-br from-[#f2f7fc] via-white to-[#fbf5ea]/40 min-h-[80vh]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        {/* Progress */}
        <div className="mb-8 sm:mb-10">
          <div className="flex justify-between text-xs text-slate-400 mb-2">
            <span>Question {currentStep + 1} of {questions.length}</span>
            <span>{Math.round(((currentStep) / questions.length) * 100)}% complete</span>
          </div>
          <div className="h-2 sm:h-2.5 bg-slate-100 rounded-full overflow-hidden progress-shimmer">
            <div
              className="h-full bg-gradient-to-r from-[#1b3a5f] to-[#c08b3e] rounded-full transition-all duration-700 ease-out"
              style={{ width: `${((currentStep) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#1b3a5f] mb-6 sm:mb-8 animate-fade-in">
          {q.question}
        </h2>

        {/* Options */}
        <div className="space-y-2.5 sm:space-y-3">
          {q.options.map((opt, i) => (
            <button
              key={opt.label}
              onClick={() => handleAnswer(q.id, opt.value, (opt as any).tag)}
              className={`w-full text-left p-4 sm:p-5 rounded-xl border border-slate-200 bg-white quiz-option text-sm sm:text-base text-slate-700 font-medium animate-fade-in-up stagger-${i + 1} min-h-[52px]`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
