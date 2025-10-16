import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Scrum Voting - Planning Poker en temps réel",
    description:
        "Application de vote Scrum en temps réel pour estimer vos user stories avec votre équipe. Planning poker collaboratif et intuitif.",
    authors: [{ name: "Clément Lefevre", url: "https://clement-lefevre.fr" }],
    creator: "Clément Lefevre",
    publisher: "Clément Lefevre",
    keywords: [
        "scrum",
        "planning poker",
        "vote",
        "agile",
        "estimation",
        "fibonacci",
        "temps réel",
        "collaboration",
    ],
    metadataBase: new URL("https://scrum-vote.clement-lefevre.fr"),
    openGraph: {
        type: "website",
        locale: "fr_FR",
        url: "https://scrum-vote.clement-lefevre.fr",
        title: "Scrum Voting - Planning Poker en temps réel",
        description:
            "Application de vote Scrum en temps réel pour estimer vos user stories avec votre équipe. Planning poker collaboratif et intuitif.",
        siteName: "Scrum Voting",
    },
    twitter: {
        card: "summary_large_image",
        title: "Scrum Voting - Planning Poker en temps réel",
        description:
            "Application de vote Scrum en temps réel pour estimer vos user stories avec votre équipe.",
        creator: "@clementlefevre",
    },
    robots: {
        index: true,
        follow: true,
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="fr">
            <body className={`font-sans antialiased`}>
                {children}
                <Analytics />
            </body>
        </html>
    );
}
