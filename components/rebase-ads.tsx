"use client";

import { useEffect, useState, useCallback } from "react";
import { X, ExternalLink, GitBranch, Star, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "rebase-ads-disabled";

const ADS = [
    {
        id: 1,
        tag: "📢 MESSAGE IMPORTANT",
        title: "Arrêtez de merger. Commencez à rebaser.",
        body: `"git rebase rewrites the commit history to produce a straight, cleaner project history."`,
        source: "— Git Official Documentation",
        sourceUrl: "https://git-scm.com/docs/git-rebase",
        cta: "Lire la doc officielle",
        ctaUrl: "https://git-scm.com/docs/git-rebase",
        accent: "bg-orange-500",
        extra: "93% des développeurs séniors préfèrent un historique linéaire.*",
        footnote: "* statistique inventée mais spirituellement vraie",
    },
    {
        id: 2,
        tag: "🔥 ARTICLE SPONSORISÉ",
        title: "Merging vs. Rebasing : pourquoi vous avez tort",
        body: `"Rebasing gives you a perfectly linear project history [...] you can follow the tip of feature branch all the way to the beginning of the project without any forks."`,
        source: "— Atlassian Git Tutorial",
        sourceUrl: "https://www.atlassian.com/git/tutorials/merging-vs-rebasing",
        cta: "Lire l'article Atlassian →",
        ctaUrl: "https://www.atlassian.com/git/tutorials/merging-vs-rebasing",
        accent: "bg-blue-600",
        extra: "Vos collègues vous remercieront. Ou pas. Mais l'historique sera propre.",
        footnote: null,
    },
    {
        id: 3,
        tag: "⚠️ AVIS DE SANTÉ PUBLIQUE",
        title: "Trop de merge commits nuisent à la lisibilité de votre repo",
        body: `"The interactive rebase gives you the opportunity to alter commits as they are moved to the new branch."`,
        source: "— Git SCM Book, Chapter 3.6",
        sourceUrl: "https://git-scm.com/book/en/v2/Git-Branching-Rebasing",
        cta: "Consultez votre git log →",
        ctaUrl: "https://git-scm.com/book/en/v2/Git-Branching-Rebasing",
        accent: "bg-red-500",
        extra: "git rebase -i HEAD~3 — essayez. Vous ne reviendrez jamais en arrière.",
        footnote: null,
    },
    {
        id: 4,
        tag: "💡 LE SAVIEZ-VOUS ?",
        title: "git rebase --onto : le Saint Graal que vous ignoriez",
        body: `"You can take the client branch, figure out the patches since it diverged from the server branch, and replay these patches in the client branch as if it was based directly off the master branch instead."`,
        source: "— Pro Git Book (Scott Chacon & Ben Straub)",
        sourceUrl: "https://git-scm.com/book/en/v2/Git-Branching-Rebasing#_more_interesting_rebases",
        cta: "Devenez un rebase sorcier →",
        ctaUrl: "https://git-scm.com/book/en/v2/Git-Branching-Rebasing#_more_interesting_rebases",
        accent: "bg-purple-600",
        extra: "Un grand pouvoir implique de grandes responsabilités (ne rebasez pas des branches partagées).",
        footnote: null,
    },
    {
        id: 5,
        tag: "🌟 TÉMOIGNAGE",
        title: '"git rebase a sauvé mon équipe"',
        body: `"The golden rule of git rebase is to never use it on public branches. But on feature branches? It's a game changer."`,
        source: "— Thiago Ghisi, Engineering Manager",
        sourceUrl: "https://medium.com/@thiagoghisi/git-rebase-vs-git-merge-a-simple-and-clear-explanation-8fca9f3dcd16",
        cta: "Lire le témoignage →",
        ctaUrl: "https://medium.com/@thiagoghisi/git-rebase-vs-git-merge-a-simple-and-clear-explanation-8fca9f3dcd16",
        accent: "bg-green-600",
        extra: "Rejoignez les milliers de développeurs qui ont un historique qui ressemble à quelque chose.",
        footnote: null,
    },
];

const POSITIONS = [
    "bottom-20 right-4",
    "bottom-20 left-4",
    "top-4 right-4",
    "top-4 left-4",
];

function CountdownClose({ onClose }: { onClose: () => void }) {
    const [seconds, setSeconds] = useState(5);

    useEffect(() => {
        if (seconds <= 0) return;
        const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
        return () => clearTimeout(t);
    }, [seconds]);

    return (
        <button
            onClick={seconds === 0 ? onClose : undefined}
            className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors ${
                seconds === 0
                    ? "bg-white/20 hover:bg-white/40 cursor-pointer text-white"
                    : "bg-white/10 cursor-not-allowed text-white/60"
            }`}
            title={seconds === 0 ? "Fermer" : `Vous pouvez fermer dans ${seconds}s`}
        >
            {seconds === 0 ? <X className="w-3.5 h-3.5" /> : seconds}
        </button>
    );
}

export function RebaseAds() {
    const [disabled, setDisabled] = useState(true);
    const [current, setCurrent] = useState<typeof ADS[0] | null>(null);
    const [positionIndex, setPositionIndex] = useState(0);
    const [adIndex, setAdIndex] = useState(0);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const isDisabled = localStorage.getItem(STORAGE_KEY) === "true";
        setDisabled(isDisabled);
    }, []);

    const showNextAd = useCallback(() => {
        setAdIndex((prev) => {
            const next = (prev + 1) % ADS.length;
            setCurrent(ADS[next]);
            return next;
        });
        setPositionIndex((prev) => (prev + 1) % POSITIONS.length);
        setVisible(true);
    }, []);

    useEffect(() => {
        if (disabled) return;

        // Première pub après 8 secondes
        const initial = setTimeout(() => {
            setCurrent(ADS[0]);
            setVisible(true);
        }, 8000);

        return () => clearTimeout(initial);
    }, [disabled]);

    useEffect(() => {
        if (disabled || !current || visible) return;

        // Pub suivante 25 secondes après fermeture
        const next = setTimeout(showNextAd, 25000);
        return () => clearTimeout(next);
    }, [disabled, current, visible, showNextAd]);

    const handleClose = () => {
        setVisible(false);
    };

    const handleDisable = () => {
        localStorage.setItem(STORAGE_KEY, "true");
        setDisabled(true);
        setVisible(false);
    };

    if (disabled || !current || !visible) return null;

    const ad = current;
    const position = POSITIONS[positionIndex];

    return (
        <div
            className={`fixed ${position} z-40 w-80 rounded-xl shadow-2xl overflow-hidden border border-white/10 animate-in slide-in-from-bottom-4 duration-500`}
            style={{ maxWidth: "calc(100vw - 2rem)" }}
        >
            {/* Header coloré */}
            <div className={`${ad.accent} px-3 py-2 flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                    <GitBranch className="w-3.5 h-3.5 text-white/80" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">
                        {ad.tag}
                    </span>
                </div>
                <CountdownClose onClose={handleClose} />
            </div>

            {/* Corps */}
            <div className="bg-gray-900 dark:bg-gray-950 text-white p-4 space-y-3">
                <h3 className="font-bold text-sm leading-snug">{ad.title}</h3>

                <blockquote className="border-l-2 border-white/30 pl-3 text-xs text-white/70 italic leading-relaxed">
                    {ad.body}
                </blockquote>

                <a
                    href={ad.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-white/50 hover:text-white/80 transition-colors"
                >
                    {ad.source}
                    <ExternalLink className="w-2.5 h-2.5" />
                </a>

                <p className="text-xs text-yellow-300/90 font-medium">{ad.extra}</p>
                {ad.footnote && (
                    <p className="text-[9px] text-white/30 italic">{ad.footnote}</p>
                )}

                <a
                    href={ad.ctaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-white text-gray-900 text-xs font-bold hover:bg-white/90 transition-colors"
                >
                    <Star className="w-3 h-3" />
                    {ad.cta}
                    <ChevronRight className="w-3 h-3" />
                </a>
            </div>

            {/* Footer avec bouton désactiver très discret */}
            <div className="bg-gray-950 dark:bg-black px-3 py-1.5 flex justify-end">
                <button
                    onClick={handleDisable}
                    className="text-[8px] text-white/15 hover:text-white/40 transition-colors"
                >
                    ne plus afficher
                </button>
            </div>
        </div>
    );
}
