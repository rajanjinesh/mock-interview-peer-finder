import { getGeminiClient } from '@/lib/geminiClient';
import { PeerMatch, CandidateRequirementInput } from '@/lib/matchingSystem';

export interface AIExplanationOutput {
  match_strength_explanation: string;
  key_strengths: string[];
  trade_offs_gaps: string[];
  why_suitable: string;
}

export interface PeerMatchWithAI extends PeerMatch {
  ai_explanation?: AIExplanationOutput;
  ai_status?: 'SUCCESS' | 'UNAVAILABLE' | 'ERROR';
  ai_error_message?: string;
}

const SYSTEM_PROMPT = `
You are an AI Match Reasoning Assistant for the Mock Interview Peer Finder.
Your purpose is to explain WHY a peer profile selected by the deterministic Matching System is suitable for a candidate.

CRITICAL CONSTRAINTS & RULES:
1. EXPLANATION LAYER ONLY: You MUST NOT select peers, change rankings, alter match scores, or filter candidates. The rank, score, and common availability are ground truth.
2. GROUNDING & HALLUCINATION CONTROL: Use ONLY the provided candidate requirements, peer profile, and structured matching factors. Do NOT invent company names, certifications, fake years of experience, or unlisted qualifications.
3. If a specific factor is missing or not provided, state that it is not specified rather than guessing.
4. STRUCTURED OUTPUT: Return ONLY a valid JSON object matching this EXACT schema:
{
  "match_strength_explanation": "Concise natural language explanation of the match score",
  "key_strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "trade_offs_gaps": ["Trade-off or gap 1", "Trade-off or gap 2"],
  "why_suitable": "Concise 2-3 sentence summary connecting peer background to candidate interview needs"
}
`;

export async function generateAIExplanationForMatch(
  userReq: CandidateRequirementInput,
  match: PeerMatch
): Promise<AIExplanationOutput> {
  const ai = getGeminiClient();

  const payload = {
    user_candidate_requirements: {
      target_role: userReq.target_role,
      seniority_level: userReq.seniority_level,
      interview_type: userReq.interview_type,
      domain_skills: userReq.domain_skills,
      availability: userReq.availability,
    },
    selected_peer: {
      full_name: match.peer_profile.full_name,
      target_role: match.peer_profile.target_role,
      seniority_level: match.peer_profile.seniority_level,
      interview_type: match.peer_profile.interview_type,
      domain_skills: match.peer_profile.domain_skills,
      availability: match.peer_profile.availability,
    },
    matching_system_output: {
      rank: match.rank,
      match_score: match.match_score,
      common_availability: match.common_availability,
      matching_factors: match.matching_factors,
    },
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: [
      { text: SYSTEM_PROMPT },
      { text: `STRUCTURED INPUT:\n${JSON.stringify(payload, null, 2)}` },
    ],
    config: {
      responseMimeType: 'application/json',
    },
  });

  const rawText = response.text || '{}';
  const cleanedText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(cleanedText);

  return {
    match_strength_explanation: parsed.match_strength_explanation || `Rated ${match.match_score}% match strength based on deterministic matching rules.`,
    key_strengths: Array.isArray(parsed.key_strengths) && parsed.key_strengths.length > 0
      ? parsed.key_strengths
      : [
          `Target role alignment: ${match.peer_profile.target_role}`,
          `Interview type match: ${match.peer_profile.interview_type}`,
          `Seniority level: ${match.peer_profile.seniority_level}`,
        ],
    trade_offs_gaps: Array.isArray(parsed.trade_offs_gaps)
      ? parsed.trade_offs_gaps
      : [`Availability overlap: ${match.common_availability.join(', ') || 'Limited'}`],
    why_suitable: parsed.why_suitable || `${match.peer_profile.full_name} is a strong peer candidate for your ${match.peer_profile.interview_type} mock interview.`,
  };
}

export async function explainPeerMatches(
  userReq: CandidateRequirementInput,
  matches: PeerMatch[]
): Promise<PeerMatchWithAI[]> {
  const results: PeerMatchWithAI[] = [];

  for (const match of matches) {
    try {
      const explanation = await generateAIExplanationForMatch(userReq, match);
      results.push({
        ...match,
        ai_explanation: explanation,
        ai_status: 'SUCCESS',
      });
    } catch (err: any) {
      console.error(`AI explanation failed for peer ${match.id}:`, err);
      results.push({
        ...match,
        ai_status: 'UNAVAILABLE',
        ai_error_message: err.message || 'AI Explanation service temporarily unavailable.',
        ai_explanation: {
          match_strength_explanation: `Rated ${match.match_score}% match strength based on matching system criteria.`,
          key_strengths: [
            `Target role alignment: ${match.peer_profile.target_role}`,
            `Interview type match: ${match.peer_profile.interview_type}`,
            `Seniority level: ${match.peer_profile.seniority_level}`,
          ],
          trade_offs_gaps: [
            match.matching_factors.seniority_match_type === 'adjacent'
              ? 'Slight seniority level difference'
              : 'Partial domain or availability overlap',
          ],
          why_suitable: `${match.peer_profile.full_name} is a suitable peer match for your ${match.peer_profile.interview_type} interview practice. (AI explanation service temporarily offline).`,
        },
      });
    }
  }

  return results;
}
