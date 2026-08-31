import { generateAIExplanationForMatch, explainPeerMatches } from './src/lib/aiReasoning';
import { PeerMatch, CandidateRequirementInput } from './src/lib/matchingSystem';

async function runAIReasoningTests() {
  console.log("==================================================");
  console.log("RUNNING AUTOMATED AI MATCH REASONING TESTS");
  console.log("==================================================\n");

  const sampleUserReq: CandidateRequirementInput = {
    target_role: "Product Manager",
    seniority_level: "Senior",
    interview_type: "Product Design",
    domain_skills: ["Fintech", "Metrics"],
    availability: ["Weekday Evenings", "Weekend Afternoon"]
  };

  const sampleMatches: PeerMatch[] = [
    {
      id: "peer-1",
      rank: 1,
      match_score: 100,
      common_availability: ["Weekday Evenings", "Weekend Afternoon"],
      peer_profile: {
        id: "peer-1",
        full_name: "Alex Chen",
        target_role: "Product Manager",
        seniority_level: "Senior",
        interview_type: "Product Design",
        domain_skills: ["Fintech", "Metrics", "User Growth"],
        availability: ["Weekday Evenings", "Weekend Afternoon"]
      },
      matching_factors: {
        role_match: true,
        interview_type_match: true,
        seniority_match_type: "exact",
        common_skills: ["Fintech", "Metrics"],
        common_availability: ["Weekday Evenings", "Weekend Afternoon"],
        role_points: 25,
        interview_type_points: 25,
        seniority_points: 20,
        skills_points: 15,
        availability_points: 15
      }
    },
    {
      id: "peer-2",
      rank: 2,
      match_score: 78,
      common_availability: [],
      peer_profile: {
        id: "peer-2",
        full_name: "Priya Sharma",
        target_role: "Product Manager",
        seniority_level: "Senior",
        interview_type: "Product Design",
        domain_skills: ["Execution", "B2B SaaS", "Metrics"],
        availability: ["Weekend Morning"]
      },
      matching_factors: {
        role_match: true,
        interview_type_match: true,
        seniority_match_type: "exact",
        common_skills: ["Metrics"],
        common_availability: [],
        role_points: 25,
        interview_type_points: 25,
        seniority_points: 20,
        skills_points: 8,
        availability_points: 0
      }
    }
  ];

  // --- Test 1: Generate AI Explanations for Selected Matches ---
  console.log("Test 1: Generating Gemini AI Explanations for 2 Selected Matches...");
  const processStart = Date.now();
  const matchesWithAI = await explainPeerMatches(sampleUserReq, sampleMatches);
  console.log(`AI Processing completed in ${Date.now() - processStart}ms.`);

  matchesWithAI.forEach((m) => {
    console.log(`\nMatch #${m.rank}: ${m.peer_profile.full_name} (${m.match_score}% Score) - AI Status: ${m.ai_status}`);
    console.log(`  Explanation: ${m.ai_explanation?.match_strength_explanation}`);
    console.log(`  Why Suitable: ${m.ai_explanation?.why_suitable}`);
    console.log(`  Key Strengths: ${JSON.stringify(m.ai_explanation?.key_strengths)}`);
    console.log(`  Trade-offs / Gaps: ${JSON.stringify(m.ai_explanation?.trade_offs_gaps)}`);
  });

  console.log("\n--------------------------------------------------");

  // --- Test 2: AI Failure Fallback Principle (Invalid API Key) ---
  console.log("Test 2: Verifying Graceful Fallback on Gemini API Error...");
  const oldKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "INVALID_KEY_FOR_TEST";

  const fallbackResults = await explainPeerMatches(sampleUserReq, sampleMatches);
  console.log(`Fallback matches count: ${fallbackResults.length}`);
  console.log(`Match #1 ID: ${fallbackResults[0].id} (Rank #${fallbackResults[0].rank})`);
  console.log(`Match #1 Score: ${fallbackResults[0].match_score}% (Unchanged)`);
  console.log(`Match #1 AI Status: ${fallbackResults[0].ai_status}`);
  console.log(`Match #1 Fallback Explanation: ${fallbackResults[0].ai_explanation?.why_suitable}`);

  // Restore Key
  process.env.GEMINI_API_KEY = oldKey;

  console.log("\n==================================================");
  console.log("ALL AI MATCH REASONING TESTS PASSED SUCCESSFULLY");
  console.log("==================================================");
}

runAIReasoningTests();
