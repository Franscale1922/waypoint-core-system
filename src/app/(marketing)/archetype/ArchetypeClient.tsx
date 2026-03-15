"use client";

import { useState, useEffect } from "react";
import {
  QUIZ_QUESTIONS,
  ARCHETYPES,
  calculateArchetype,
  QuizOption,
  ArchetypeId,
} from "@/lib/archetypes";
import { trackQuizStarted, trackQuizCompleted, trackBookCallClicked } from "@/app/lib/analytics";

type Phase = "quiz" | "capture" | "result";

export default function ArchetypeClient() {
  const [phase, setPhase] = useState<Phase>("quiz");
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<QuizOption[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [archetypeId, setArchetypeId] = useState<ArchetypeId | null>(null);

  useEffect(() => {
    trackQuizStarted();
  }, []);

  const handleAnswer = (option: QuizOption) => {
    const newOptions = [...selectedOptions, option];
    setSelectedOptions(newOptions);

    if (currentStep < QUIZ_QUESTIONS.length - 1) {
      setTimeout(() => setCurrentStep(currentStep + 1), 280);
    } else {
      // All questions answered — go to email capture
      setTimeout(() => setPhase("capture"), 280);
    }
  };

  const handleSubmit = async () => {
    if (!email || !name) return;
    setIsSubmitting(true);

    const result = calculateArchetype(selectedOptions);
    setArchetypeId(result);

    const archetype = ARCHETYPES[result];

    try {
      await fetch("/api/archetype-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          archetype: result,
          archetypeName: archetype.name,
          strongFits: archetype.strongFits,
          weakFits: archetype.weakFits,
        }),
      });
      trackQuizCompleted(0); // re-use existing analytics event
      setPhase("result");
    } catch {
      // Show result anyway — don't block the user on API failure
      setPhase("result");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ——————————————
  // RESULT SCREEN
  // ——————————————
  if (phase === "result" && archetypeId) {
    const archetype = ARCHETYPES[archetypeId];
    return (
      <section className="py-16 sm:py-24 bg-gradient-to-br from-[#f2f7fc] via-white to-[#fbf5ea]/40 min-h-[80vh]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          {/* Archetype Badge */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#f5ebd1] text-4xl sm:text-5xl mb-5 shadow-md">
              {archetype.emoji}
            </div>
            <p className="text-xs font-semibold tracking-widest text-[#c08b3e] uppercase mb-2">
              Your Franchise Archetype
            </p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1b3a5f] leading-tight">
              {archetype.name}
            </h1>
            <p className="mt-3 text-lg sm:text-xl text-slate-500 italic font-medium">
              &ldquo;{archetype.tagline}&rdquo;
            </p>
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8 mb-6">
            <p className="text-base sm:text-lg text-slate-700 leading-relaxed">
              {archetype.description}
            </p>
          </div>

          {/* Strong Fits */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">✅</span>
              <h2 className="text-base font-bold text-[#1b3a5f]">Industries that tend to fit you well</h2>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {archetype.strongFits.map((fit) => (
                <span
                  key={fit}
                  className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-emerald-50 text-emerald-800 border border-emerald-200"
                >
                  {fit}
                </span>
              ))}
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              {archetype.strongFitReason}
            </p>
          </div>

          {/* Weak Fits */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8 mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">⚠️</span>
              <h2 className="text-base font-bold text-[#1b3a5f]">Industries that often don&apos;t align</h2>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {archetype.weakFits.map((fit) => (
                <span
                  key={fit}
                  className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-slate-100 text-slate-500 border border-slate-200"
                >
                  {fit}
                </span>
              ))}
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              {archetype.weakFitReason}
            </p>
          </div>

          {/* Advisor Note */}
          <div className="bg-[#0c1929] rounded-2xl p-6 sm:p-8 mb-8">
            <p className="text-xs font-semibold tracking-widest text-[#c08b3e] uppercase mb-3">
              A note from Kelsey
            </p>
            <p className="text-base sm:text-lg text-white/90 leading-relaxed">
              {archetype.advisorNote}
            </p>
          </div>

          {/* CTA */}
          <div className="text-center">
            <a
              href="/book"
              id="archetype-result-book-cta"
              onClick={() => trackBookCallClicked("archetype_result")}
              className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-[#0c1929] bg-[#d4a55a] hover:bg-[#e2be80] rounded-xl shadow-lg transition-all press-effect min-h-[52px]"
            >
              Book a Free Call. Let&apos;s Match the Brands
            </a>
            <p className="mt-3 text-xs text-slate-400">
              This call is free. Franchise brands pay the advisory fee, not you.
            </p>
            <p className="mt-6 text-sm text-slate-500 mb-3">Want to check your readiness too?</p>
            <a
              href="/scorecard"
              className="inline-flex items-center justify-center px-7 py-3.5 text-sm font-semibold text-[#0c1929] bg-[#d4a55a] hover:bg-[#c49848] rounded-xl transition-all press-effect min-h-[48px]"
            >
              Take the Readiness Quiz
            </a>
          </div>
        </div>
      </section>
    );
  }

  // ——————————————
  // EMAIL CAPTURE
  // ——————————————
  if (phase === "capture") {
    return (
      <section className="py-16 sm:py-24 bg-gradient-to-br from-[#f2f7fc] via-white to-[#fbf5ea]/40 min-h-[80vh]">
        <div className="max-w-xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#f5ebd1] text-2xl mb-4">
              🎯
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1b3a5f]">
              Your archetype is ready.
            </h2>
            <p className="mt-3 text-base text-slate-500">
              Drop your name and email and I&apos;ll show you exactly what type of franchise owner you are, and which categories to focus on.
            </p>
          </div>
          <div className="space-y-3 sm:space-y-4">
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
              id="archetype-capture-submit"
              onClick={handleSubmit}
              disabled={!email || !name || isSubmitting}
              className="w-full py-4 bg-gradient-to-r from-[#1b3a5f] to-[#234e7e] hover:from-[#234e7e] hover:to-[#2c6299] text-white font-semibold rounded-xl shadow-lg transition-all disabled:opacity-50 press-effect min-h-[48px] text-base"
            >
              {isSubmitting ? "Calculating your archetype..." : "See My Archetype"}
            </button>
          </div>
          <p className="mt-4 text-xs text-slate-400 text-center">
            We will never sell your information. Zero spam guarantee.
          </p>
        </div>
      </section>
    );
  }

  // ——————————————
  // QUIZ SCREEN
  // ——————————————
  const q = QUIZ_QUESTIONS[currentStep];
  const progress = Math.round((currentStep / QUIZ_QUESTIONS.length) * 100);

  return (
    <section className="py-16 sm:py-24 bg-gradient-to-br from-[#f2f7fc] via-white to-[#fbf5ea]/40 min-h-[80vh]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-xs font-semibold tracking-widest text-[#c08b3e] uppercase mb-2">
            Franchise Archetype Quiz
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1b3a5f]">
            What kind of franchise owner are you?
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            8 questions. No wrong answers. Honest results.
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8 sm:mb-10">
          <div className="flex justify-between text-xs text-slate-400 mb-2">
            <span>Question {currentStep + 1} of {QUIZ_QUESTIONS.length}</span>
            <span>{progress}% complete</span>
          </div>
          <div className="h-2 sm:h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#1b3a5f] to-[#c08b3e] rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <h2
          key={q.id}
          className="text-xl sm:text-2xl md:text-3xl font-bold text-[#1b3a5f] mb-6 sm:mb-8 animate-fade-in"
        >
          {q.question}
        </h2>

        {/* Options */}
        <div className="space-y-2.5 sm:space-y-3">
          {q.options.map((opt, i) => (
            <button
              key={opt.label}
              id={`archetype-q${currentStep + 1}-opt${i + 1}`}
              onClick={() => handleAnswer(opt)}
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
