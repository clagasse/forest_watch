"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Mail, X } from "lucide-react";
import type {
  FomProjectSummary,
  InspectCutblockRecord,
  InspectResult,
} from "@/data/bcForestryData";

type RecipientMode = "fom_comment" | "mla_minister";

type FocusTopicId =
  | "old_growth"
  | "watershed"
  | "wildlife"
  | "wildfire"
  | "recreation";

const FOCUS_TOPICS: Array<{
  id: FocusTopicId;
  label: string;
  fomParagraph: string;
  mlaParagraph: string;
}> = [
  {
    id: "old_growth",
    label: "Old Growth & Big Trees",
    fomParagraph:
      "Public forest inventory records indicate older forest structure and/or high-productivity growing conditions at this site. Please clarify how old-growth retention targets, 2021 Technical Advisory Panel deferral recommendations, and field-verified stand ages are being protected.",
    mlaParagraph:
      "Public inventory records indicate older forest structure and/or productive old-growth habitat in this cutblock. I urge the Province to ensure remaining productive and ancient old growth is prioritized for permanent protection and deferral implementation.",
  },
  {
    id: "watershed",
    label: "Drinking-Water & Watershed",
    fomParagraph:
      "This location overlaps or lies near sensitive watershed values. Please provide details on hydrological assessments, cumulative Equivalent Clearcut Area (ECA), riparian buffers, and measures to protect community drinking water quality and peak-flow stability.",
    mlaParagraph:
      "Protecting community drinking-water watersheds and downstream salmon/fish-bearing streams should take precedence over short-term timber extraction. Please confirm what independent hydrological oversight applies here.",
  },
  {
    id: "wildlife",
    label: "Wildlife & Habitat",
    fomParagraph:
      "Provincial overlays show sensitive wildlife habitat or winter range values at this site. Please explain how operational plans, seasonal timing windows, and canopy retention will avoid fragmenting habitat for species at risk and ungulates.",
    mlaParagraph:
      "Provincial mapping flags important wildlife habitat values in this area. Please ensure legally binding habitat protections and landscape connectivity are upheld ahead of permit approval.",
  },
  {
    id: "wildfire",
    label: "Wildfire Verification",
    fomParagraph:
      "Provincial records show a historical wildfire overlap at this site. Please clarify whether proposed harvesting is targeted post-fire salvage or live green-tree harvest, and confirm how surviving legacy trees and soil stability will be retained.",
    mlaParagraph:
      "Because this area overlaps a mapped wildfire perimeter, residents need clear public disclosure on whether proposed cutting is post-fire salvage or intact green-tree harvesting.",
  },
  {
    id: "recreation",
    label: "Local Recreation & Viewscapes",
    fomParagraph:
      "Please outline how visual quality objectives, public trail access, and local community recreation values will be safeguarded during road building and harvesting operations.",
    mlaParagraph:
      "Local residents rely on surrounding public forest lands for recreation, tourism, and community well-being. Please ensure local community input is meaningfully reflected before cutting permits are issued.",
  },
];

export interface CommentDraftModalProps {
  open: boolean;
  onClose: () => void;
  inspectResult: InspectResult;
  activeCutblock: InspectCutblockRecord | null;
  selectedFomProject: FomProjectSummary | null;
  shareUrl: string;
}

export default function CommentDraftModal({
  open,
  onClose,
  inspectResult,
  activeCutblock,
  selectedFomProject,
  shareUrl,
}: CommentDraftModalProps) {
  const [recipient, setRecipient] = useState<RecipientMode>("fom_comment");
  const [selectedTopics, setSelectedTopics] = useState<FocusTopicId[]>([]);
  const [senderName, setSenderName] = useState("");
  const [community, setCommunity] = useState("");
  const [customNote, setCustomNote] = useState("");
  const [draftText, setDraftText] = useState("");
  const [copied, setCopied] = useState(false);

  // Auto-select relevant focus topics when modal opens
  useEffect(() => {
    if (!open) return;
    const auto: FocusTopicId[] = [];
    const { forest, designations } = inspectResult;
    if (
      forest.isOldGrowth ||
      designations.tapPriorityDeferral ||
      designations.legalOgma
    ) {
      auto.push("old_growth");
    }
    if (designations.communityWatershed) {
      auto.push("watershed");
    }
    if (
      designations.wildlifeHabitatArea ||
      designations.ungulateWinterRange
    ) {
      auto.push("wildlife");
    }
    if (designations.recentWildfire) {
      auto.push("wildfire");
    }
    if (auto.length === 0) {
      auto.push("recreation");
    }
    setSelectedTopics(auto);

    if (
      activeCutblock &&
      activeCutblock.stage !== "fom_proposed" &&
      !selectedFomProject
    ) {
      setRecipient("mla_minister");
    } else {
      setRecipient("fom_comment");
    }
  }, [open, inspectResult, activeCutblock, selectedFomProject]);

  const generatedDraft = useMemo(() => {
    const [lng, lat] = inspectResult.coordinates;
    const { forest, designations, riskAssessment } = inspectResult;
    const blockTitle =
      activeCutblock?.name ||
      selectedFomProject?.name ||
      `Forest Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    const district =
      activeCutblock?.district ||
      selectedFomProject?.district ||
      "BC Natural Resource District";
    const fomId = selectedFomProject?.fomId || activeCutblock?.fomId;
    const fspHolder =
      activeCutblock?.licensee || selectedFomProject?.fspHolder || null;

    const factLines: string[] = [
      `- Location: ${blockTitle}${fomId ? ` (FOM #${fomId})` : ""}`,
      `- District / Proponent: ${district}${fspHolder ? ` · ${fspHolder}` : ""}`,
      `- Coordinates: ${lat.toFixed(4)}° N, ${Math.abs(lng).toFixed(4)}° W`,
      `- Map Reference: ${shareUrl}`,
    ];

    if (forest.hasInventory) {
      factLines.push(
        `- Standing Forest (BC VRI): ${forest.standAgeYears ?? "N/A"} yrs old, ${forest.canopyHeightMeters ?? "N/A"} m canopy, Site Index ${forest.siteIndexMeters ?? "N/A"} m, ${forest.dominantSpecies || "N/A"} (${forest.becZoneName || forest.becZone || "BC"})`
      );
    }

    const overlaps: string[] = [];
    if (designations.legalOgma)
      overlaps.push(`Protected Old-Growth Area (${designations.legalOgma})`);
    if (designations.protectedPark)
      overlaps.push(`BC Park (${designations.protectedPark})`);
    if (designations.tapPriorityDeferral)
      overlaps.push(
        `2021 Recommended Deferral (${designations.tapPriorityDeferral})`
      );
    if (designations.wildlifeHabitatArea)
      overlaps.push(`Wildlife Habitat (${designations.wildlifeHabitatArea})`);
    if (designations.ungulateWinterRange)
      overlaps.push(
        `Winter Wildlife Range (${designations.ungulateWinterRange})`
      );
    if (designations.communityWatershed)
      overlaps.push(
        `Community Drinking-Water Watershed (${designations.communityWatershed})`
      );
    if (designations.recentWildfire) {
      overlaps.push(
        `Wildfire Overlap (${designations.recentWildfire.fireYear}${designations.recentWildfire.burnSeverity ? ` · ${designations.recentWildfire.burnSeverity} severity` : ""})`
      );
    }
    if (overlaps.length > 0) {
      factLines.push(`- Mapped Overlays: ${overlaps.join("; ")}`);
    } else if (riskAssessment?.label) {
      factLines.push(`- Screening Summary: ${riskAssessment.label}`);
    }

    const topicParagraphs = FOCUS_TOPICS.filter((t) =>
      selectedTopics.includes(t.id)
    ).map((t) =>
      recipient === "fom_comment" ? t.fomParagraph : t.mlaParagraph
    );

    const signOffName = senderName.trim() || "[Your Name]";
    const signOffPlace = community.trim()
      ? `${community.trim()}, BC`
      : "[Your Community, BC]";

    if (recipient === "fom_comment") {
      return [
        `Re: Public Comment on ${blockTitle}${fomId ? ` (FOM #${fomId})` : ""}`,
        "",
        "To the Forest Stewardship Plan Holder and Reviewing District Staff,",
        "",
        "I am submitting the following site-specific public comment regarding the proposed logging area summarized below:",
        "",
        ...factLines,
        "",
        ...topicParagraphs.flatMap((p) => [p, ""]),
        ...(customNote.trim() ? [customNote.trim(), ""] : []),
        "Thank you for considering these public forest values and providing a written response on how these concerns will be addressed prior to cutting permit application.",
        "",
        "Sincerely,",
        signOffName,
        signOffPlace,
      ].join("\n");
    }

    return [
      `Subject: Forest Stewardship & Public Oversight Request — ${blockTitle}`,
      "",
      "Dear MLA / Minister of Forests,",
      "",
      "I am writing as a British Columbia resident to share concerns regarding the following forestry area:",
      "",
      ...factLines,
      "",
      ...topicParagraphs.flatMap((p) => [p, ""]),
      ...(customNote.trim() ? [customNote.trim(), ""] : []),
      "I respectfully ask that the Ministry review these mapped ecological and watershed values and ensure transparent public accountability before further harvesting proceeds.",
      "",
      "Sincerely,",
      signOffName,
      signOffPlace,
    ].join("\n");
  }, [
    inspectResult,
    activeCutblock,
    selectedFomProject,
    shareUrl,
    selectedTopics,
    recipient,
    senderName,
    community,
    customNote,
  ]);

  useEffect(() => {
    setDraftText(generatedDraft);
  }, [generatedDraft]);

  if (!open) return null;

  const toggleTopic = (id: FocusTopicId) => {
    setSelectedTopics((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draftText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Ignore clipboard errors
    }
  };

  const mailtoHref = (() => {
    const title =
      selectedFomProject?.name ||
      activeCutblock?.name ||
      "BC Forestry Stewardship Inquiry";
    const clippedBody =
      draftText.length > 1350 ? `${draftText.slice(0, 1350)}...` : draftText;
    return `mailto:FOR.Minister@gov.bc.ca?subject=${encodeURIComponent(
      `Forestry Stewardship: ${title}`
    )}&body=${encodeURIComponent(clippedBody)}`;
  })();

  const fomPortalUrl =
    activeCutblock?.fomProjectUrl ||
    selectedFomProject?.fomProjectUrl ||
    "https://fom.nrs.gov.bc.ca/public/projects";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[1px] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="draft-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-2xl bg-white border border-[#DDD7C9] rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90dvh] flex flex-col overflow-hidden"
      >
        <div className="px-4 sm:px-5 py-3.5 border-b border-[#E3DDD0] bg-[#F4F0E6] flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1D523B]">
              Civic Action Helper
            </div>
            <h2
              id="draft-modal-title"
              className="font-serif text-base font-semibold text-[#11241C]"
            >
              Draft Site-Specific Comment or MLA Letter
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close letter builder"
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-200/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {/* Recipient Mode Toggle */}
          <div className="grid grid-cols-2 gap-1 bg-[#F8F5EE] border border-[#DDD7C9] p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setRecipient("fom_comment")}
              className={`py-1.5 px-3 rounded-lg font-medium transition-colors ${
                recipient === "fom_comment"
                  ? "bg-[#143929] text-white shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              30-Day FOM Public Comment
            </button>
            <button
              type="button"
              onClick={() => setRecipient("mla_minister")}
              className={`py-1.5 px-3 rounded-lg font-medium transition-colors ${
                recipient === "mla_minister"
                  ? "bg-[#143929] text-white shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Local MLA / Minister of Forests
            </button>
          </div>

          {/* Focus Topic Chips */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
              Select Focus Areas (Auto-preselected from site data)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {FOCUS_TOPICS.map((topic) => {
                const active = selectedTopics.includes(topic.id);
                return (
                  <button
                    key={topic.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleTopic(topic.id)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                      active
                        ? "bg-[#143929] text-white border-[#143929]"
                        : "bg-[#FAF8F4] text-stone-700 border-stone-300 hover:bg-stone-100"
                    }`}
                  >
                    {topic.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Personalization */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Your name (optional)"
              className="w-full bg-[#FAF8F4] text-stone-900 px-3 py-1.5 rounded-lg border border-stone-200 focus:outline-none focus:border-emerald-700"
            />
            <input
              type="text"
              value={community}
              onChange={(e) => setCommunity(e.target.value)}
              placeholder="Your community / town (optional)"
              className="w-full bg-[#FAF8F4] text-stone-900 px-3 py-1.5 rounded-lg border border-stone-200 focus:outline-none focus:border-emerald-700"
            />
          </div>

          <input
            type="text"
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            placeholder="Add a personal note (e.g. local trail, creek, or community concern)..."
            className="w-full bg-[#FAF8F4] text-stone-900 px-3 py-1.5 rounded-lg border border-stone-200 focus:outline-none focus:border-emerald-700"
          />

          {/* Editable Draft Preview */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-stone-500">
              <span>Editable Draft (runs locally in your browser)</span>
              <span>{draftText.length} chars</span>
            </div>
            <textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              rows={10}
              className="w-full bg-[#FAF8F4] text-stone-800 font-mono text-[11px] leading-relaxed p-3 rounded-lg border border-stone-300 focus:outline-none focus:border-emerald-700"
            />
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-4 sm:px-5 py-3 border-t border-[#E3DDD0] bg-[#FAF8F4] flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#143929] hover:bg-[#1D523B] text-white text-xs font-semibold transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied Draft</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Draft</span>
                </>
              )}
            </button>
            {recipient === "fom_comment" ? (
              <a
                href={fomPortalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-stone-300 hover:bg-stone-100 text-stone-800 text-xs font-medium transition-colors"
              >
                <span>Open FOM Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <>
                <a
                  href={mailtoHref}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-stone-300 hover:bg-stone-100 text-stone-800 text-xs font-medium transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email Minister</span>
                </a>
                <a
                  href="https://www.leg.bc.ca/members"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-stone-300 hover:bg-stone-100 text-stone-800 text-xs font-medium transition-colors"
                >
                  <span>Find Your MLA</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-stone-500 hover:text-stone-800 font-medium px-2 py-1"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
